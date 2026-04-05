import { prisma } from '../../prisma/client'
import { getOrSet, invalidate } from '../../redis/client'
import { NotFoundError } from '../../utils/AppError'
import { Category } from '@prisma/client'
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(2),
  nameAm: z.string().min(2),
  description: z.string().optional(),
  category: z.nativeEnum(Category),
  unit: z.string(),
  wholesalePrice: z.number().positive(),
  retailPrice: z.number().positive(),
  minOrderQty: z.number().int().positive().default(1),
  imageUrl: z.string().url().optional(),
})

export const updateProductSchema = createProductSchema.partial()

export type CreateProductDto = z.infer<typeof createProductSchema>
export type UpdateProductDto = z.infer<typeof updateProductSchema>

export const productsService = {
  async list(category?: string, search?: string) {
    const cacheKey = `products:${category || 'all'}:${search || ''}`
    return getOrSet(cacheKey, 300, () =>
      prisma.product.findMany({
        where: {
          isAvailable: true,
          ...(category && { category: category as Category }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { nameAm: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: { category: 'asc' },
      })
    )
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new NotFoundError('Product')
    return product
  },

  async create(dto: CreateProductDto) {
    const product = await prisma.product.create({ data: dto })
    await invalidate('products:all:')
    return product
  },

  async update(id: string, dto: UpdateProductDto) {
    await this.getById(id)
    const product = await prisma.product.update({ where: { id }, data: dto })
    await invalidate('products:all:')
    return product
  },

  async toggleAvailability(id: string) {
    const product = await this.getById(id)
    return prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    })
  },
}
