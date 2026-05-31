import axios from 'axios'
import { prisma } from '../prisma/client'
import { logger } from './logger'

interface PushData {
  [key: string]: unknown
}

/** Send Expo push notifications. No-ops gracefully if a user has no devices. */
export const pushService = {
  async sendToUser(userId: string, title: string, body: string, data?: PushData) {
    const devices = await prisma.deviceToken.findMany({ where: { userId } })
    if (devices.length === 0) return
    const messages = devices.map((d) => ({ to: d.token, title, body, data, sound: 'default' }))
    try {
      await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err: any) {
      logger.warn('Push send failed', { err: err?.message })
    }
  },

  async sendToShop(shopId: string, title: string, body: string, data?: PushData) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { userId: true } })
    if (shop) await this.sendToUser(shop.userId, title, body, data)
  },
}
