import { colors } from '../theme'

export const STATUS_COLOR: Record<string, string> = {
  PENDING: colors.warning,
  CONFIRMED: '#3b82f6',
  IN_TRANSIT: '#a855f7',
  DELIVERED: colors.success,
  CANCELLED: colors.danger,
  AGGREGATING: colors.brand,
  PURCHASING: '#06b6d4',
  ACTIVE: colors.warning,
  REPAID: colors.success,
  DEFAULTED: colors.danger,
}

export const ORDER_STEPS = ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED'] as const
