import { Response, NextFunction } from 'express'
import { ordersService } from './orders.service'
import { placeOrderSchema } from './orders.schema'
import { AuthRequest } from '../../middleware/auth.middleware'

export const ordersController = {
  async place(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dto = placeOrderSchema.parse(req.body)
      const order = await ordersService.place(req.user!.id, dto)
      res.status(201).json({ success: true, data: order })
    } catch (err) { next(err) }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orders = await ordersService.getMyOrders(req.user!.id)
      res.json({ success: true, data: orders })
    } catch (err) { next(err) }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.getById(req.params.id, req.user!.id)
      res.json({ success: true, data: order })
    } catch (err) { next(err) }
  },

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.cancel(req.params.id, req.user!.id)
      res.json({ success: true, data: order })
    } catch (err) { next(err) }
  },
}
