import { Prisma } from '@prisma/client'

/**
 * Transactional outbox event types. Producers write these in the same DB
 * transaction as the state change; the outbox worker delivers them.
 */
export const OUTBOX_EVENTS = {
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  WALLET_TOPPED_UP: 'wallet.topped_up',
  ORDER_PAID: 'order.paid',
} as const

export type OutboxEventType = (typeof OUTBOX_EVENTS)[keyof typeof OUTBOX_EVENTS]

/**
 * Append a domain event to the outbox inside an existing transaction. The event
 * is committed atomically with the state change and delivered asynchronously by
 * the outbox worker (at-least-once).
 */
export async function publishEvent(
  tx: Prisma.TransactionClient,
  type: OutboxEventType,
  payload: Record<string, unknown>
): Promise<void> {
  await tx.outboxEvent.create({
    data: { type, payload: payload as Prisma.InputJsonValue },
  })
}
