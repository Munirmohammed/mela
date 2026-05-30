import { z } from 'zod'

export const initiatePaymentSchema = z.object({
  purpose: z.enum(['ORDER', 'WALLET_TOPUP']).default('ORDER'),
  method: z.enum(['CHAPA', 'WALLET']).default('CHAPA'),
  orderId: z.string().optional(),
  amount: z.number().positive().optional(),
})

export const topUpSchema = z.object({
  amount: z.number().positive(),
})

export type InitiatePaymentDto = z.infer<typeof initiatePaymentSchema>
export type TopUpDto = z.infer<typeof topUpSchema>
