import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { AppError, NotFoundError } from '../../utils/AppError'
import { writeAudit } from '../../utils/audit'
import { publishEvent, OUTBOX_EVENTS } from '../../outbox/outbox'
import { paymentProvider } from './chapa.service'
import { walletService } from './wallet.service'
import { paymentRetryQueue } from '../../jobs/queues'
import { logger } from '../../utils/logger'
import { env } from '../../config/env'

type Tx = Prisma.TransactionClient

export interface InitiateParams {
  shopId: string
  purpose: 'ORDER' | 'WALLET_TOPUP'
  method: 'CHAPA' | 'WALLET'
  orderId?: string
  amount?: number
  idempotencyKey: string
  contact?: { email?: string; phone?: string; firstName?: string }
}

function checkoutUrlOf(meta: Prisma.JsonValue | null): string | null {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const url = (meta as Record<string, unknown>).checkoutUrl
    return typeof url === 'string' ? url : null
  }
  return null
}

/** Mark a payment settled and apply its side effects exactly once. */
async function settle(tx: Tx, paymentId: string) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new NotFoundError('Payment')
  if (payment.status === 'SUCCESS') return payment // already settled — idempotent

  await tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS' } })

  if (payment.purpose === 'ORDER' && payment.orderId) {
    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'PAID', chapaRef: payment.providerRef },
    })
    await publishEvent(tx, OUTBOX_EVENTS.ORDER_PAID, {
      orderId: payment.orderId,
      shopId: payment.shopId,
      paymentId: payment.id,
      amount: payment.amount,
    })
  } else if (payment.purpose === 'WALLET_TOPUP') {
    await walletService.credit(
      payment.shopId,
      payment.amount,
      { reason: 'Wallet top-up', refType: 'PAYMENT', refId: payment.id },
      tx
    )
    await publishEvent(tx, OUTBOX_EVENTS.WALLET_TOPPED_UP, {
      shopId: payment.shopId,
      paymentId: payment.id,
      amount: payment.amount,
    })
  }

  await publishEvent(tx, OUTBOX_EVENTS.PAYMENT_SUCCEEDED, {
    paymentId: payment.id,
    shopId: payment.shopId,
    orderId: payment.orderId,
    amount: payment.amount,
    purpose: payment.purpose,
  })
  await writeAudit(tx, {
    actor: 'system',
    action: 'PAYMENT_SUCCEEDED',
    entity: 'Payment',
    entityId: payment.id,
    meta: { amount: payment.amount, purpose: payment.purpose, provider: payment.provider },
  })
  return payment
}

export const paymentsService = {
  async initiate(params: InitiateParams) {
    // Resolve the authoritative amount (never trust a client-supplied order amount).
    let amount = params.amount ?? 0
    if (params.purpose === 'ORDER') {
      if (!params.orderId) throw new AppError('orderId is required for order payments', 400)
      const order = await prisma.order.findFirst({
        where: { id: params.orderId, shopId: params.shopId },
      })
      if (!order) throw new NotFoundError('Order')
      if (order.paymentStatus === 'PAID') throw new AppError('Order is already paid', 409)
      amount = order.totalAmount
    } else {
      if (params.method !== 'CHAPA') throw new AppError('Wallet top-up must use CHAPA', 400)
      if (!amount || amount <= 0) throw new AppError('A positive amount is required', 400)
    }

    // Pay directly from wallet balance.
    if (params.method === 'WALLET') {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.payment.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        })
        if (existing) return { payment: existing, checkoutUrl: null }

        await walletService.debit(
          params.shopId,
          amount,
          { reason: 'Order payment', refType: 'ORDER', refId: params.orderId },
          tx
        )
        const payment = await tx.payment.create({
          data: {
            shopId: params.shopId,
            orderId: params.orderId,
            amount,
            method: 'CHAPA', // schema enum has no WALLET method; provider records the source
            provider: 'WALLET',
            purpose: params.purpose,
            status: 'PENDING',
            idempotencyKey: params.idempotencyKey,
          },
        })
        await settle(tx, payment.id)
        const fresh = await tx.payment.findUnique({ where: { id: payment.id } })
        return { payment: fresh!, checkoutUrl: null }
      })
    }

    // CHAPA: idempotent create, then hand off to the gateway.
    try {
      const payment = await prisma.payment.create({
        data: {
          shopId: params.shopId,
          orderId: params.orderId,
          amount,
          method: 'CHAPA',
          provider: paymentProvider.name,
          purpose: params.purpose,
          status: 'PENDING',
          idempotencyKey: params.idempotencyKey,
          providerRef: undefined,
        },
      })
      // tx_ref = payment.id so webhooks/verification resolve back to this record.
      const init = await paymentProvider.initialize({
        txRef: payment.id,
        amount,
        currency: 'ETB',
        email: params.contact?.email,
        phone: params.contact?.phone,
        firstName: params.contact?.firstName,
        callbackUrl: `${env.FRONTEND_URL}/payments/callback`,
        returnUrl: `${env.FRONTEND_URL}/payments/return`,
      })
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerRef: payment.id,
          meta: { checkoutUrl: init.checkoutUrl } as Prisma.InputJsonValue,
        },
      })
      // Safety net in case the webhook is missed: re-verify after a delay.
      paymentRetryQueue
        .add(
          'verify',
          { paymentId: payment.id },
          {
            delay: 120_000,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60_000 },
            removeOnComplete: true,
            removeOnFail: 100,
          }
        )
        .catch((err) => logger.warn('Failed to enqueue payment verify', { err: err?.message }))
      return { payment: updated, checkoutUrl: init.checkoutUrl }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Duplicate idempotency key — return the original payment.
        const existing = await prisma.payment.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        })
        if (existing) return { payment: existing, checkoutUrl: checkoutUrlOf(existing.meta) }
      }
      throw err
    }
  },

  /** Handle a provider webhook. Verifies the signature, then settles idempotently. */
  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!paymentProvider.verifyWebhookSignature(rawBody, signature)) {
      throw new AppError('Invalid webhook signature', 401)
    }
    let event: any
    try {
      event = JSON.parse(rawBody.toString('utf8'))
    } catch {
      throw new AppError('Invalid webhook payload', 400)
    }

    const txRef: string | undefined = event.tx_ref ?? event.reference ?? event.data?.tx_ref
    const status: string | undefined = event.status ?? event.data?.status
    if (!txRef) throw new AppError('Webhook missing tx_ref', 400)

    const payment = await prisma.payment.findFirst({
      where: { OR: [{ id: txRef }, { providerRef: txRef }] },
    })
    if (!payment) throw new NotFoundError('Payment')

    if (status === 'success') {
      await prisma.$transaction((tx) => settle(tx, payment.id))
      return { processed: true, paymentId: payment.id }
    }

    if (status === 'failed') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
      await prisma.$transaction((tx) =>
        publishEvent(tx, OUTBOX_EVENTS.PAYMENT_FAILED, {
          paymentId: payment.id,
          shopId: payment.shopId,
          orderId: payment.orderId,
        })
      )
    }
    return { processed: false, paymentId: payment.id }
  },

  /** Re-verify a pending payment against the provider (used by the retry worker). */
  async verifyAndReconcile(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new NotFoundError('Payment')
    if (payment.status === 'SUCCESS') return payment

    const result = await paymentProvider.verify(payment.providerRef ?? payment.id)
    if (result.status === 'success') {
      await prisma.$transaction((tx) => settle(tx, payment.id))
    }
    return prisma.payment.findUnique({ where: { id: paymentId } })
  },

  async getById(id: string, shopId: string) {
    const payment = await prisma.payment.findFirst({ where: { id, shopId } })
    if (!payment) throw new NotFoundError('Payment')
    return payment
  },
}
