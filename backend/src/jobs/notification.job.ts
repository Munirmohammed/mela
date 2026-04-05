import { Worker, Job } from 'bullmq'
import { redis } from '../redis/client'
import { smsService } from '../utils/sms.service'
import { prisma } from '../prisma/client'
import { logger } from '../utils/logger'

export const notificationWorker = new Worker(
  'sms-notification',
  async (job: Job) => {
    const { name, data } = job

    switch (name) {
      case 'order-placed': {
        const date = new Date(data.scheduledFor).toLocaleDateString('en-ET')
        await smsService.send(
          data.phone,
          `Mela: Order confirmed! Total: ${data.totalAmount} ETB. Delivery on ${date}. Order ID: ${data.orderId.slice(-6)}`
        )
        await prisma.notification.create({
          data: {
            shopId: data.shopId,
            type: 'ORDER_CONFIRMED',
            title: 'Order Placed',
            message: `Your order of ${data.totalAmount} ETB has been placed successfully.`,
          },
        })
        break
      }

      case 'batch-confirmed': {
        const date = new Date(data.scheduledAt).toLocaleDateString('en-ET')
        await smsService.send(
          data.phone,
          `Mela: Your order is confirmed and will be delivered on ${date} morning. Track it on the app.`
        )
        await prisma.notification.create({
          data: {
            shopId: data.shopId,
            type: 'BATCH_DISPATCHED',
            title: 'Delivery Scheduled',
            message: `Your order will be delivered on ${date}.`,
          },
        })
        break
      }

      case 'out-for-delivery': {
        await smsService.send(
          data.phone,
          `Mela: Your order is out for delivery! Driver ${data.driverName} is on the way. Track live on the app.`
        )
        break
      }

      case 'delivered': {
        await smsService.send(
          data.phone,
          `Mela: Order delivered! Thank you for using Mela. Rate your experience on the app.`
        )
        break
      }
    }
  },
  { connection: redis }
)

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} failed`, { err: err.message })
})
