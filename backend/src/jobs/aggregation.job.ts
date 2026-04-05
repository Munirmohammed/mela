import { Worker, Job } from 'bullmq'
import { redis } from '../redis/client'
import { prisma } from '../prisma/client'
import { routeQueue, notificationQueue } from './queues'
import { logger } from '../utils/logger'
import { Zone } from '@prisma/client'

interface AggregationJobData {
  zone: Zone
  windowDate: string
}

export const aggregationWorker = new Worker<AggregationJobData>(
  'order-aggregation',
  async (job: Job<AggregationJobData>) => {
    const { zone, windowDate } = job.data
    logger.info(`🔄 Aggregating orders for zone: ${zone}, window: ${windowDate}`)

    const windowEnd = new Date(windowDate)
    const windowStart = new Date(windowEnd)
    windowStart.setHours(0, 0, 0, 0)

    const orders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        batchId: null,
        scheduledFor: { gte: windowStart, lte: windowEnd },
        shop: { zone },
      },
      include: {
        items: { include: { product: true } },
        shop: true,
      },
    })

    if (orders.length === 0) {
      logger.info(`No orders for zone ${zone} in this window`)
      return
    }

    // Build bulk purchase list
    const bulkMap = new Map<string, { name: string; nameAm: string; unit: string; totalQty: number; wholesalePrice: number }>()
    for (const order of orders) {
      for (const item of order.items) {
        const existing = bulkMap.get(item.productId)
        if (existing) {
          existing.totalQty += item.quantity
        } else {
          bulkMap.set(item.productId, {
            name: item.product.name,
            nameAm: item.product.nameAm,
            unit: item.product.unit,
            totalQty: item.quantity,
            wholesalePrice: item.product.wholesalePrice,
          })
        }
      }
    }

    const bulkList = Array.from(bulkMap.entries()).map(([productId, data]) => ({
      productId,
      ...data,
      estimatedCost: data.totalQty * data.wholesalePrice,
    }))

    const totalEstimatedCost = bulkList.reduce((sum, item) => sum + item.estimatedCost, 0)

    // Create delivery batch
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(6, 0, 0, 0) // 6AM delivery start

    const batch = await prisma.deliveryBatch.create({
      data: {
        zone,
        bulkList,
        totalOrders: orders.length,
        scheduledAt: tomorrow,
        orders: { connect: orders.map((o) => ({ id: o.id })) },
      },
    })

    // Update orders to CONFIRMED
    await prisma.order.updateMany({
      where: { id: { in: orders.map((o) => o.id) } },
      data: { status: 'CONFIRMED' },
    })

    logger.info(`✅ Batch ${batch.id} created for zone ${zone}: ${orders.length} orders, ${bulkList.length} products, ~${totalEstimatedCost} ETB`)

    // Notify all shop owners
    for (const order of orders) {
      await notificationQueue.add('batch-confirmed', {
        shopId: order.shop.id,
        phone: order.shop.phone,
        orderId: order.id,
        batchId: batch.id,
        scheduledAt: tomorrow,
      })
    }

    // Trigger route optimization
    await routeQueue.add('optimize', { batchId: batch.id })
  },
  { connection: redis }
)

aggregationWorker.on('completed', (job) => {
  logger.info(`Aggregation job ${job.id} completed`)
})

aggregationWorker.on('failed', (job, err) => {
  logger.error(`Aggregation job ${job?.id} failed`, { err: err.message })
})
