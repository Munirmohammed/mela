import { env } from '../config/env'
import { logger } from './logger'

// Africa's Talking SMS service
let AT: any = null

function getAT() {
  if (!AT && env.AT_API_KEY && env.AT_USERNAME) {
    const AfricasTalking = require('africastalking')
    AT = AfricasTalking({ apiKey: env.AT_API_KEY, username: env.AT_USERNAME })
  }
  return AT
}

export const smsService = {
  async send(phone: string, message: string) {
    if (env.NODE_ENV === 'development') {
      logger.info(`📱 SMS to ${phone}: ${message}`)
      return
    }

    try {
      const at = getAT()
      if (!at) {
        logger.warn('SMS service not configured')
        return
      }
      await at.SMS.send({ to: [phone], message, from: 'Mela' })
    } catch (err: any) {
      logger.error('SMS send failed', { phone, err: err.message })
    }
  },

  async sendOtp(phone: string, otp: string) {
    await this.send(phone, `Your Mela verification code is: ${otp}. Valid for 5 minutes. Do not share.`)
  },
}
