import { prisma } from '../../prisma/client'
import { AppError, NotFoundError } from '../../utils/AppError'
import { PlaceOrderDto } from './orders.schema'
import { notificationQueue } from '../../jobs/queues'

const DELIVERY_FEE = 30 // ETB

function getNextAggregationWindow(): Date {
  const now = new Date()
  const cutoff = new Date()
  cutoff.setHours(21, 0, 0, 0) // 9PM

  // If before 9PM today → today's window; else → tomorrow
  if (now < cutoff) {
    return cutoff
  } else {
    cutoff.setDate(cutoff.getDate() + 1)
    return cutoff
  }
}

export const ordersService = {
  async place(userId: string, dto: PlaceOrderDto) {
    const shop = await prisma.shop.findUnique({ where: { userId } })
    if (!shop) throw new NotFoundError('Shop')
    if (!shop.isVerified) throw new AppError('Your shop is pending verification', 403)

    // Validate credit payment
    if (dto.paymentMethod === 'CREDIT') {
      if (shop.creditScore < 50) throw new AppError('Insufficient credit score for credit payment', 400)
    }

    // Fetch products and calculate total
    const productIds = dto.items.map((i) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true },
    })

    if (products.length !== productIds.length) {
      throw new AppError('One or more products are unavailable', 400)
    }

    let subtotal = 0
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!
      if (item.quantity < product.minOrderQty) {
        throw new AppError(`Minimum order for ${product.name} is ${product.minOrderQty} ${product.unit}`, 400)
      }
      const lineTotal = product.retailPrice * item.quantity
      subtotal += lineTotal
      return { productId: item.productId, quantity: item.quantity, unitPrice: product.retailPrice }
    })

    const totalAmount = subtotal + DELIVERY_FEE
    const scheduledFor = getNextAggregationWindow()

    const order = await prisma.order.create({
      data: {
        shopId: shop.id,
        totalAmount,
        deliveryFee: DELIVERY_FEE,
        paymentMethod: dto.paymentMethod,
        scheduledFor,
        notes: dto.notes,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } } },
    })

    // Queue SMS notification
    await notificationQueue.add('order-placed', {
      shopId: shop.id,
      phone: shop.phone,
      orderId: order.id,
      totalAmount,
      scheduledFor,
    })

    return order
  },

  async getMyOrders(userId: string, page?: { skip: number; take: number }) {
    const shop = await prisma.shop.findUnique({ where: { userId } })
    if (!shop) throw new NotFoundError('Shop')

    return prisma.order.findMany({
      where: { shopId: shop.id },
      include: {
        items: { include: { product: { select: { name: true, nameAm: true, imageUrl: true, unit: true } } } },
        batch: { select: { status: true, scheduledAt: true, driverId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: page?.skip ?? 0,
      take: page?.take ?? 50,
    })
  },

  async getById(id: string, userId: string) {
    const shop = await prisma.shop.findUnique({ where: { userId } })
    const order = await prisma.order.findFirst({
      where: { id, shopId: shop?.id },
      include: {
        items: { include: { product: true } },
        batch: { include: { driver: true } },
      },
    })
    if (!order) throw new NotFoundError('Order')
    return order
  },

  async cancel(id: string, userId: string) {
    const shop = await prisma.shop.findUnique({ where: { userId } })
    const order = await prisma.order.findFirst({ where: { id, shopId: shop?.id } })
    if (!order) throw new NotFoundError('Order')

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new AppError('Order cannot be cancelled at this stage', 400)
    }

    if (order.batchId) {
      const batch = await prisma.deliveryBatch.findUnique({ where: { id: order.batchId } })
      if (batch && batch.status !== 'AGGREGATING') {
        throw new AppError('Order is already being processed', 400)
      }
    }

    return prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } })
  },
}
