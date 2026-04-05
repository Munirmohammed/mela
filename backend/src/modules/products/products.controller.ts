import { Request, Response, NextFunction } from 'express'
import { productsService, createProductSchema, updateProductSchema } from './products.service'

export const productsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search } = req.query
      const products = await productsService.list(category as string, search as string)
      res.json({ success: true, data: products })
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getById(req.params.id)
      res.json({ success: true, data: product })
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createProductSchema.parse(req.body)
      const product = await productsService.create(dto)
      res.status(201).json({ success: true, data: product })
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateProductSchema.parse(req.body)
      const product = await productsService.update(req.params.id, dto)
      res.json({ success: true, data: product })
    } catch (err) { next(err) }
  },

  async toggleAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.toggleAvailability(req.params.id)
      res.json({ success: true, data: product })
    } catch (err) { next(err) }
  },
}
