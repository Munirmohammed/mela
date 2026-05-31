import { Prisma, BatchStatus } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { NotFoundError, ForbiddenError } from '../../utils/AppError'
import { writeAudit } from '../../utils/audit'
import { logger } from '../../utils/logger'
import { notificationQueue, creditQueue } from '../../jobs/queues'
import { routeOptimizer, MERKATO } from './route.service'
import { emitToOrder, emitToBatch } from '../../realtime/socket'
import { etaMinutes } from '../../utils/geo'
import { canTransition, assertTransition } from './batch-state'
import { loyaltyService } from '../loyalty/loyalty.service'

async function requireDriver(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } })
  if (!driver) throw new NotFoundError('Driver')
  return driver
}

export interface PodInput {
  photoUrl?: string
  recipientName?: string
  otp?: string
  lat?: number
  lng?: number
  note?: string
}

export const deliveryService = {
  canTransition,

  /** Optimize and persist the stop sequence for a batch. Idempotent. */
  async buildRoute(batchId: string) {
    const batch = await prisma.deliveryBatch.findUnique({
      where: { id: batchId },
      include: { orders: { include: { shop: true } }, stops: true },
    })
    if (!batch) throw new NotFoundError('Batch')
    if (batch.stops.length > 0) return batch.stops // already built

    const stopInputs = batch.orders.map((o) => ({
      orderId: o.id,
      shopId: o.shopId,
      lat: o.shop.lat,
      lng: o.shop.lng,
    }))
    const optimized = await routeOptimizer.optimize(MERKATO, stopInputs)

    await prisma.$transaction(async (tx) => {
      for (const s of optimized.stops) {
        await tx.deliveryStop.create({
          data: {
            batchId,
            orderId: s.orderId,
            shopId: s.shopId,
            sequence: s.sequence,
            lat: s.lat,
            lng: s.lng,
          },
        })
      }
      await tx.deliveryBatch.update({
        where: { id: batchId },
        data: {
          route: {
            provider: optimized.provider,
            polyline: optimized.polyline ?? null,
            origin: optimized.origin,
            waypoints: optimized.stops,
          } as unknown as Prisma.InputJsonValue,
        },
      })
    })
    logger.info(`🗺️  Route built for batch ${batchId}: ${optimized.stops.length} stops (${optimized.provider})`)
    return prisma.deliveryStop.findMany({ where: { batchId }, orderBy: { sequence: 'asc' } })
  },

  // ---- Admin ----
  async assignDriver(batchId: string, driverId: string, actor: string) {
    const batch = await prisma.deliveryBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw new NotFoundError('Batch')
    const driver = await prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) throw new NotFoundError('Driver')
    const updated = await prisma.deliveryBatch.update({
      where: { id: batchId },
      data: { driverId },
    })
    await writeAudit(prisma, {
      actor,
      action: 'BATCH_DRIVER_ASSIGNED',
      entity: 'DeliveryBatch',
      entityId: batchId,
      meta: { driverId },
    })
    return updated
  },

  async setStatus(batchId: string, to: BatchStatus, actor: string) {
    const batch = await prisma.deliveryBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw new NotFoundError('Batch')
    assertTransition(batch.status, to)
    const data: Prisma.DeliveryBatchUpdateInput = { status: to }
    if (to === 'IN_TRANSIT') data.startedAt = new Date()
    if (to === 'DELIVERED') data.deliveredAt = new Date()
    const updated = await prisma.deliveryBatch.update({ where: { id: batchId }, data })
    await writeAudit(prisma, {
      actor,
      action: 'BATCH_STATUS_CHANGED',
      entity: 'DeliveryBatch',
      entityId: batchId,
      meta: { from: batch.status, to },
    })
    return updated
  },

  // ---- Driver ----
  async getDriverBatch(userId: string) {
    const driver = await requireDriver(userId)
    return prisma.deliveryBatch.findFirst({
      where: { driverId: driver.id, status: { in: ['PURCHASING', 'IN_TRANSIT'] } },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          include: { order: { include: { shop: true, items: { include: { product: true } } } }, proof: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })
  },

  async startDelivery(userId: string, batchId: string) {
    const driver = await requireDriver(userId)
    const batch = await prisma.deliveryBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw new NotFoundError('Batch')
    if (batch.driverId !== driver.id) throw new ForbiddenError('Not your batch')
    assertTransition(batch.status, 'IN_TRANSIT')
    const updated = await prisma.deliveryBatch.update({
      where: { id: batchId },
      data: { status: 'IN_TRANSIT', startedAt: new Date() },
    })
    // Notify each shop their order is out for delivery.
    const orders = await prisma.order.findMany({
      where: { batchId },
      include: { shop: true },
    })
    for (const o of orders) {
      await notificationQueue.add('out-for-delivery', {
        phone: o.shop.phone,
        driverName: driver.name,
      })
      emitToOrder(o.id, 'out-for-delivery', { batchId, driverName: driver.name })
    }
    await writeAudit(prisma, {
      actor: userId,
      action: 'BATCH_STATUS_CHANGED',
      entity: 'DeliveryBatch',
      entityId: batchId,
      meta: { from: batch.status, to: 'IN_TRANSIT' },
    })
    return updated
  },

  async arriveAtStop(userId: string, stopId: string) {
    const driver = await requireDriver(userId)
    const stop = await prisma.deliveryStop.findUnique({
      where: { id: stopId },
      include: { batch: true },
    })
    if (!stop) throw new NotFoundError('Stop')
    if (stop.batch.driverId !== driver.id) throw new ForbiddenError('Not your stop')
    const updated = await prisma.deliveryStop.update({
      where: { id: stopId },
      data: { status: 'ARRIVED', arrivedAt: new Date() },
    })
    emitToOrder(stop.orderId, 'stop-arrived', { stopId })
    return updated
  },

  async deliverStop(userId: string, stopId: string, pod: PodInput) {
    const driver = await requireDriver(userId)
    const stop = await prisma.deliveryStop.findUnique({
      where: { id: stopId },
      include: { batch: true, order: { include: { shop: true } } },
    })
    if (!stop) throw new NotFoundError('Stop')
    if (stop.batch.driverId !== driver.id) throw new ForbiddenError('Not your stop')
    if (stop.status === 'DELIVERED') return stop // idempotent

    let batchCompleted = false
    await prisma.$transaction(async (tx) => {
      await tx.proofOfDelivery.upsert({
        where: { stopId },
        create: {
          stopId,
          photoUrl: pod.photoUrl,
          recipientName: pod.recipientName,
          otp: pod.otp,
          otpVerified: Boolean(pod.otp),
          lat: pod.lat,
          lng: pod.lng,
          note: pod.note,
        },
        update: {
          photoUrl: pod.photoUrl,
          recipientName: pod.recipientName,
          otp: pod.otp,
          otpVerified: Boolean(pod.otp),
          lat: pod.lat,
          lng: pod.lng,
          note: pod.note,
        },
      })
      await tx.deliveryStop.update({
        where: { id: stopId },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      })
      // Mark the order delivered; cash-on-delivery is settled on hand-off.
      await tx.order.update({
        where: { id: stop.orderId },
        data: {
          status: 'DELIVERED',
          ...(stop.order.paymentMethod === 'CASH' ? { paymentStatus: 'PAID' } : {}),
        },
      })
      await writeAudit(tx, {
        actor: userId,
        action: 'STOP_DELIVERED',
        entity: 'DeliveryStop',
        entityId: stopId,
        meta: { orderId: stop.orderId, recipientName: pod.recipientName },
      })
      const remaining = await tx.deliveryStop.count({
        where: { batchId: stop.batchId, status: { not: 'DELIVERED' } },
      })
      if (remaining === 0) {
        await tx.deliveryBatch.update({
          where: { id: stop.batchId },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        })
        batchCompleted = true
      }
    })

    // Side effects after commit.
    await notificationQueue.add('delivered', { phone: stop.order.shop.phone })
    await creditQueue.add('recalc', { shopId: stop.shopId })
    // Mela Points: 1 point per 100 ETB delivered.
    await loyaltyService
      .award(stop.shopId, Math.floor(stop.order.totalAmount / 100), 'Order delivered')
      .catch(() => undefined)
    emitToOrder(stop.orderId, 'order-delivered', { stopId, orderId: stop.orderId })
    if (batchCompleted) emitToBatch(stop.batchId, 'batch-delivered', { batchId: stop.batchId })

    return prisma.deliveryStop.findUnique({ where: { id: stopId }, include: { proof: true } })
  },

  async pushLocation(userId: string, batchId: string, lat: number, lng: number) {
    const driver = await requireDriver(userId)
    const batch = await prisma.deliveryBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw new NotFoundError('Batch')
    if (batch.driverId !== driver.id) throw new ForbiddenError('Not your batch')
    await prisma.driverLocation.create({ data: { driverId: driver.id, batchId, lat, lng } })
    emitToBatch(batchId, 'location-update', { lat, lng, at: new Date().toISOString() })
    return { ok: true }
  },

  // ---- Shop (tracking) ----
  async getTracking(orderId: string, userId: string) {
    const shop = await prisma.shop.findUnique({ where: { userId } })
    const order = await prisma.order.findFirst({
      where: { id: orderId, shopId: shop?.id },
      include: { stop: { include: { proof: true } }, batch: { include: { driver: true } } },
    })
    if (!order) throw new NotFoundError('Order')

    let driverLocation = null
    let eta: number | null = null
    if (order.batchId) {
      driverLocation = await prisma.driverLocation.findFirst({
        where: { batchId: order.batchId },
        orderBy: { recordedAt: 'desc' },
      })
      if (
        driverLocation &&
        typeof order.stop?.lat === 'number' &&
        typeof order.stop?.lng === 'number'
      ) {
        eta = etaMinutes(
          { lat: driverLocation.lat, lng: driverLocation.lng },
          { lat: order.stop.lat, lng: order.stop.lng }
        )
      }
    }

    return {
      orderStatus: order.status,
      batchId: order.batchId,
      batchStatus: order.batch?.status ?? null,
      stop: order.stop,
      driver: order.batch?.driver
        ? { name: order.batch.driver.name, vehicle: order.batch.driver.vehicle, plateNo: order.batch.driver.plateNo }
        : null,
      driverLocation,
      etaMinutes: eta,
    }
  },
}
