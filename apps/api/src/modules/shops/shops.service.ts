import { z } from 'zod'
import { prisma } from '../../prisma/client'
import { NotFoundError } from '../../utils/AppError'

export const updateShopSchema = z.object({
  shopName: z.string().min(2).optional(),
  ownerName: z.string().min(2).optional(),
  address: z.string().min(2).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export type UpdateShopDto = z.infer<typeof updateShopSchema>

export const shopsService = {
  async getMe(userId: string) {
    const shop = await prisma.shop.findUnique({
      where: { userId },
      include: { wallet: true },
    })
    if (!shop) throw new NotFoundError('Shop')

    const [totalOrders, deliveredOrders, spend] = await Promise.all([
      prisma.order.count({ where: { shopId: shop.id } }),
      prisma.order.count({ where: { shopId: shop.id, status: 'DELIVERED' } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { shopId: shop.id, status: 'DELIVERED' },
      }),
    ])

    const { wallet, ...rest } = shop
    return {
      ...rest,
      walletBalance: wallet?.balance ?? 0,
      stats: {
        totalOrders,
        deliveredOrders,
        totalSpent: spend._sum.totalAmount ?? 0,
      },
    }
  },

  async updateMe(userId: string, dto: UpdateShopDto) {
    const shop = await prisma.shop.findUnique({ where: { userId } })
    if (!shop) throw new NotFoundError('Shop')
    return prisma.shop.update({ where: { id: shop.id }, data: dto })
  },
}
