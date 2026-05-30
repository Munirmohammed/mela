import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'
import { logger } from './logger'

/** Accepts either the base client or a transaction client, so audits can be
 *  written inside the same transaction as the change they describe. */
type Db = Prisma.TransactionClient | typeof prisma

export interface AuditInput {
  actor: string // userId or "system"
  action: string // e.g. "PAYMENT_SUCCEEDED", "WALLET_DEBITED"
  entity: string // e.g. "Payment", "Wallet", "Order"
  entityId: string
  meta?: Record<string, unknown>
}

/**
 * Append an immutable audit record. Best-effort: a failure here must never break
 * the business operation, so it is logged and swallowed.
 */
export async function writeAudit(db: Db, input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actor: input.actor,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: (input.meta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    })
  } catch (err: any) {
    logger.warn('Failed to write audit log', { action: input.action, err: err?.message })
  }
}
