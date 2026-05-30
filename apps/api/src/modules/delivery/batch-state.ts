import { BatchStatus } from '@prisma/client'
import { AppError } from '../../utils/AppError'

/** Allowed batch lifecycle transitions. */
export const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  AGGREGATING: ['PURCHASING'],
  PURCHASING: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
}

export function canTransition(from: BatchStatus, to: BatchStatus): boolean {
  return BATCH_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: BatchStatus, to: BatchStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError(`Illegal batch transition: ${from} → ${to}`, 400)
  }
}
