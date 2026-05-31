import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../../middleware/auth.middleware'
import { prisma } from '../../prisma/client'

const router = Router()
router.use(authenticate)

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.string().optional(),
})

// Register (or refresh) an Expo push token for the current user's device.
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token, platform } = registerSchema.parse(req.body)
    const device = await prisma.deviceToken.upsert({
      where: { token },
      update: { userId: req.user!.id, platform },
      create: { userId: req.user!.id, token, platform },
    })
    res.status(201).json({ success: true, data: { id: device.id } })
  } catch (err) {
    next(err)
  }
})

export default router
