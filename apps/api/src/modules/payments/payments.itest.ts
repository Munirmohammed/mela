import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { HAS_DB, prisma, resetDb, makeShop, makeOrder } from '../../test/integration'

// Avoid importing the BullMQ/Redis-backed queues during payment tests.
vi.mock('../../jobs/queues', () => ({
  paymentRetryQueue: { add: vi.fn().mockResolvedValue(undefined) },
  notificationQueue: { add: vi.fn().mockResolvedValue(undefined) },
  creditQueue: { add: vi.fn().mockResolvedValue(undefined) },
  aggregationQueue: { add: vi.fn().mockResolvedValue(undefined) },
  routeQueue: { add: vi.fn().mockResolvedValue(undefined) },
}))

import { paymentsService } from './payments.service'
import { walletService } from './wallet.service'

describe.skipIf(!HAS_DB)('payments (integration)', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })
  beforeEach(async () => {
    await resetDb()
  })

  it('pays an order from wallet and is idempotent on the same key', async () => {
    const { shop } = await makeShop()
    await walletService.credit(shop.id, 1000, { reason: 'seed' })
    const order = await makeOrder(shop.id, 200)

    const key = 'idem-wallet-1'
    const first = await paymentsService.initiate({
      shopId: shop.id,
      purpose: 'ORDER',
      method: 'WALLET',
      orderId: order.id,
      idempotencyKey: key,
    })
    expect(first.payment.status).toBe('SUCCESS')

    // Replaying the same idempotency key must not debit twice.
    const second = await paymentsService.initiate({
      shopId: shop.id,
      purpose: 'ORDER',
      method: 'WALLET',
      orderId: order.id,
      idempotencyKey: key,
    })
    expect(second.payment.id).toBe(first.payment.id)

    const { balance } = await walletService.getBalance(shop.id)
    expect(balance).toBe(800) // debited once
    const paid = await prisma.order.findUnique({ where: { id: order.id } })
    expect(paid?.paymentStatus).toBe('PAID')
  })

  it('settles a Chapa payment on webhook and is idempotent on replays', async () => {
    const { shop } = await makeShop()
    const order = await makeOrder(shop.id, 350)
    const payment = await prisma.payment.create({
      data: {
        shopId: shop.id,
        orderId: order.id,
        amount: 350,
        method: 'CHAPA',
        provider: 'CHAPA',
        purpose: 'ORDER',
        status: 'PENDING',
        idempotencyKey: 'idem-chapa-1',
        providerRef: undefined,
      },
    })
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: payment.id } })

    const body = Buffer.from(JSON.stringify({ tx_ref: payment.id, status: 'success' }))
    // Stub provider accepts any signature outside production.
    const r1 = await paymentsService.handleWebhook(body, 'sig')
    expect(r1.processed).toBe(true)

    const r2 = await paymentsService.handleWebhook(body, 'sig')
    expect(r2.processed).toBe(true)

    const settled = await prisma.payment.findUnique({ where: { id: payment.id } })
    expect(settled?.status).toBe('SUCCESS')
    const paidOrder = await prisma.order.findUnique({ where: { id: order.id } })
    expect(paidOrder?.paymentStatus).toBe('PAID')

    // Exactly one PAYMENT_SUCCEEDED outbox event despite two webhooks.
    const events = await prisma.outboxEvent.findMany({ where: { type: 'payment.succeeded' } })
    expect(events).toHaveLength(1)
  })
})
