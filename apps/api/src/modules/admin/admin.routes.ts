import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middleware/auth.middleware'
import { prisma } from '../../prisma/client'
import { aggregationQueue } from '../../jobs/queues'
import { AuthRequest } from '../../middleware/auth.middleware'
import { NextFunction, Response } from 'express'
import { Zone, BatchStatus } from '@prisma/client'
import { deliveryService } from '../delivery/delivery.service'

const router = Router()
router.use(authenticate, requireAdmin)

// Analytics overview
router.get('/analytics', async (_req, res: Response, next: NextFunction) => {
  try {
    const [totalShops, totalOrders, totalRevenue, activeBatches, pendingVerifications] =
      await Promise.all([
        prisma.shop.count(),
        prisma.order.count(),
        prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: 'DELIVERED' } }),
        prisma.deliveryBatch.count({ where: { status: { in: ['AGGREGATING', 'PURCHASING', 'IN_TRANSIT'] } } }),
        prisma.shop.count({ where: { isVerified: false } }),
      ])

    res.json({
      success: true,
      data: {
        totalShops,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        activeBatches,
        pendingVerifications,
      },
    })
  } catch (err) { next(err) }
})

// All batches
router.get('/batches', async (_req, res: Response, next: NextFunction) => {
  try {
    const batches = await prisma.deliveryBatch.findMany({
      include: {
        driver: true,
        orders: { include: { shop: { select: { shopName: true, address: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ success: true, data: batches })
  } catch (err) { next(err) }
})

// All orders
router.get('/orders', async (req, res: Response, next: NextFunction) => {
  try {
    const { zone, status, page = '1' } = req.query
    const skip = (Number(page) - 1) * 20
    const orders = await prisma.order.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(zone && { shop: { zone: zone as Zone } }),
      },
      include: { shop: { select: { shopName: true, zone: true, phone: true } }, items: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      skip,
    })
    res.json({ success: true, data: orders })
  } catch (err) { next(err) }
})

// All shops
router.get('/shops', async (req, res: Response, next: NextFunction) => {
  try {
    const take = 50
    const skip = (Number(req.query.page ?? '1') - 1) * take
    const shops = await prisma.shop.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })
    res.json({ success: true, data: shops })
  } catch (err) { next(err) }
})

// Verify shop
router.put('/shops/:id/verify', async (req, res: Response, next: NextFunction) => {
  try {
    const shop = await prisma.shop.update({
      where: { id: req.params.id },
      data: { isVerified: true },
    })
    res.json({ success: true, data: shop })
  } catch (err) { next(err) }
})

// Add driver
router.post('/drivers', async (req, res: Response, next: NextFunction) => {
  try {
    const { name, phone, vehicle, plateNo } = req.body
    // Create user account for driver
    const user = await prisma.user.create({
      data: {
        phone,
        role: 'DRIVER',
        driver: { create: { name, phone, vehicle, plateNo } },
      },
      include: { driver: true },
    })
    res.status(201).json({ success: true, data: user.driver })
  } catch (err) { next(err) }
})

// Assign a driver to a batch
router.put('/batches/:id/assign-driver', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const batch = await deliveryService.assignDriver(
      req.params.id,
      req.body.driverId,
      req.user?.id ?? 'admin'
    )
    res.json({ success: true, data: batch })
  } catch (err) { next(err) }
})

// Transition a batch status (e.g. AGGREGATING -> PURCHASING)
router.put('/batches/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const batch = await deliveryService.setStatus(
      req.params.id,
      req.body.status as BatchStatus,
      req.user?.id ?? 'admin'
    )
    res.json({ success: true, data: batch })
  } catch (err) { next(err) }
})

// Manually trigger aggregation for a zone (for testing / ops)
router.post('/trigger-aggregation', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { zone } = req.body
    await aggregationQueue.add('manual-aggregate', {
      zone,
      windowDate: new Date().toISOString(),
    })
    res.json({ success: true, message: `Aggregation triggered for zone ${zone}` })
  } catch (err) { next(err) }
})

export default router
