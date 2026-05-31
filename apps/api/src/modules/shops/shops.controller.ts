import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { shopsService, updateShopSchema } from './shops.service'

export const shopsController = {
  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const shop = await shopsService.getMe(req.user!.id)
      res.json({ success: true, data: shop })
    } catch (err) {
      next(err)
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dto = updateShopSchema.parse(req.body)
      const shop = await shopsService.updateMe(req.user!.id, dto)
      res.json({ success: true, data: shop })
    } catch (err) {
      next(err)
    }
  },
}
