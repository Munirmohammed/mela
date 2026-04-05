import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { registerSchema, verifyOtpSchema, refreshSchema } from './auth.schema'
import { AuthRequest } from '../../middleware/auth.middleware'

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = registerSchema.parse(req.body)
      const result = await authService.register(dto)
      res.status(201).json({ success: true, ...result })
    } catch (err) { next(err) }
  },

  async loginRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body
      const result = await authService.sendLoginOtp(phone)
      res.json({ success: true, ...result })
    } catch (err) { next(err) }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = verifyOtpSchema.parse(req.body)
      const result = await authService.verifyOtp(dto)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body)
      const result = await authService.refresh(refreshToken)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user!.id)
      res.json({ success: true, message: 'Logged out' })
    } catch (err) { next(err) }
  },
}
