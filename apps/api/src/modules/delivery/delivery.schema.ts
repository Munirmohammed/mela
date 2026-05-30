import { z } from 'zod'

export const deliverStopSchema = z.object({
  photoUrl: z.string().url().optional(),
  recipientName: z.string().optional(),
  otp: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  note: z.string().optional(),
})

export const locationSchema = z.object({
  batchId: z.string(),
  lat: z.number(),
  lng: z.number(),
})

export const assignDriverSchema = z.object({ driverId: z.string() })

export const batchStatusSchema = z.object({
  status: z.enum(['PURCHASING', 'IN_TRANSIT', 'DELIVERED']),
})

export type DeliverStopDto = z.infer<typeof deliverStopSchema>
