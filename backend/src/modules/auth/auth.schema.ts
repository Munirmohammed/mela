import { z } from 'zod'

export const registerSchema = z.object({
  phone: z.string().regex(/^\+251[0-9]{9}$/, 'Phone must be Ethiopian format: +251XXXXXXXXX'),
  ownerName: z.string().min(2),
  shopName: z.string().min(2),
  zone: z.enum(['BOLE', 'KIRKOS', 'YEKA', 'ARADA', 'LIDETA', 'NIFAS_SILK']),
  address: z.string().min(5),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export const verifyOtpSchema = z.object({
  phone: z.string(),
  code: z.string().length(6),
})

export const refreshSchema = z.object({
  refreshToken: z.string(),
})

export type RegisterDto = z.infer<typeof registerSchema>
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>
