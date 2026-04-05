import { z } from 'zod'

export const placeOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  paymentMethod: z.enum(['CASH', 'CHAPA', 'CREDIT']),
  notes: z.string().optional(),
})

export type PlaceOrderDto = z.infer<typeof placeOrderSchema>
