import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../prisma/client'
import { redis } from '../../redis/client'
import { env } from '../../config/env'
import { AppError, ConflictError, UnauthorizedError } from '../../utils/AppError'
import { RegisterDto, VerifyOtpDto } from './auth.schema'
import { smsService } from '../../utils/sms.service'
import { Zone } from '@prisma/client'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateTokens(payload: { id: string; phone: string; role: string }) {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  })
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  })
  return { accessToken, refreshToken }
}

export const authService = {
  async register(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({ where: { phone: dto.phone } })
    if (existing) throw new ConflictError('Phone number already registered')

    // Store registration data temporarily in Redis (10 min)
    await redis.setex(`reg:${dto.phone}`, 600, JSON.stringify(dto))

    // Generate and store OTP
    const otp = generateOtp()
    await prisma.otpCode.create({
      data: {
        phone: dto.phone,
        code: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    })

    // Send SMS
    await smsService.sendOtp(dto.phone, otp)

    return { message: 'OTP sent to your phone' }
  },

  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) throw new UnauthorizedError('Invalid or expired OTP')

    // Mark OTP used
    await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } })

    // Check if existing user (login) or new user (register)
    let user = await prisma.user.findUnique({ where: { phone: dto.phone } })

    if (!user) {
      // New registration — get stored data
      const regData = await redis.get(`reg:${dto.phone}`)
      if (!regData) throw new AppError('Registration session expired. Please register again.', 400)

      const reg: RegisterDto = JSON.parse(regData)

      user = await prisma.user.create({
        data: {
          phone: reg.phone,
          role: 'SHOP_OWNER',
          shop: {
            create: {
              ownerName: reg.ownerName,
              shopName: reg.shopName,
              phone: reg.phone,
              zone: reg.zone as Zone,
              address: reg.address,
              lat: reg.lat,
              lng: reg.lng,
            },
          },
        },
      })

      await redis.del(`reg:${dto.phone}`)
    }

    const tokens = generateTokens({ id: user.id, phone: user.phone, role: user.role })

    // Store refresh token in Redis
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken)

    return { ...tokens, role: user.role }
  },

  async sendLoginOtp(phone: string) {
    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) throw new AppError('Phone not registered', 404)

    const otp = generateOtp()
    await prisma.otpCode.create({
      data: { phone, code: otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    })

    await smsService.sendOtp(phone, otp)
    return { message: 'OTP sent' }
  },

  async refresh(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        id: string; phone: string; role: string
      }

      const stored = await redis.get(`refresh:${payload.id}`)
      if (!stored || stored !== token) throw new UnauthorizedError('Invalid refresh token')

      const tokens = generateTokens(payload)
      await redis.setex(`refresh:${payload.id}`, 7 * 24 * 60 * 60, tokens.refreshToken)

      return tokens
    } catch {
      throw new UnauthorizedError('Invalid refresh token')
    }
  },

  async logout(userId: string) {
    await redis.del(`refresh:${userId}`)
    return { message: 'Logged out' }
  },
}
