import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'
import { notificationQueue } from '../jobs/queues'
import { OUTBOX_EVENTS } from './outbox'

const BATCH = 20
const INTERVAL_MS = 5000
const MAX_ATTEMPTS = 5

async function dispatch(type: string, payload: any): Promise<void> {
  switch (type) {
    case OUTBOX_EVENTS.ORDER_PAID:
      await notificationQueue.add('order-paid', payload)
      break
    case OUTBOX_EVENTS.WALLET_TOPPED_UP:
      await notificationQueue.add('wallet-topup', payload)
      break
    case OUTBOX_EVENTS.PAYMENT_SUCCEEDED:
    case OUTBOX_EVENTS.PAYMENT_FAILED:
      // Informational for now; consumers (analytics, ledgers) can subscribe later.
      break
    default:
      logger.warn('Unknown outbox event type', { type })
  }
}

/** Process one batch of pending outbox events. Exported for tests. */
export async function processOutboxOnce(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: BATCH,
  })
  for (const ev of events) {
    try {
      await dispatch(ev.type, ev.payload)
      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data: { status: 'PROCESSED', processedAt: new Date(), attempts: { increment: 1 } },
      })
    } catch (err: any) {
      const attempts = ev.attempts + 1
      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data: {
          attempts,
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          error: String(err?.message ?? err).slice(0, 500),
        },
      })
      logger.warn('Outbox dispatch failed', { id: ev.id, type: ev.type, err: err?.message })
    }
  }
  return events.length
}

let timer: NodeJS.Timeout | null = null

export function startOutboxProcessor(): void {
  if (timer) return
  timer = setInterval(() => {
    processOutboxOnce().catch((e) => logger.error('Outbox loop error', { err: e?.message }))
  }, INTERVAL_MS)
  logger.info('📤 Outbox processor started')
}

export function stopOutboxProcessor(): void {
  if (timer) clearInterval(timer)
  timer = null
}
