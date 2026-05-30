import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../middleware/auth.middleware'
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many requests, please try again later' },
})

const router = Router()

router.post('/register', authLimiter, authController.register)
router.post('/login', authLimiter, authController.loginRequest)
router.post('/verify-otp', authLimiter, authController.verifyOtp)
router.post('/refresh', authController.refresh)
router.post('/logout', authenticate, authController.logout)

export default router
