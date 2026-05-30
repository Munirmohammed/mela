import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { deliveryService } from './delivery.service'
import { deliverStopSchema, locationSchema } from './delivery.schema'

export const deliveryController = {
  async myBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const batch = await deliveryService.getDriverBatch(req.user!.id)
      res.json({ success: true, data: batch })
    } catch (err) {
      next(err)
    }
  },

  async start(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const batch = await deliveryService.startDelivery(req.user!.id, req.params.id)
      res.json({ success: true, data: batch })
    } catch (err) {
      next(err)
    }
  },

  async arrive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stop = await deliveryService.arriveAtStop(req.user!.id, req.params.id)
      res.json({ success: true, data: stop })
    } catch (err) {
      next(err)
    }
  },

  async deliver(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pod = deliverStopSchema.parse(req.body)
      const stop = await deliveryService.deliverStop(req.user!.id, req.params.id, pod)
      res.json({ success: true, data: stop })
    } catch (err) {
      next(err)
    }
  },

  async pushLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { batchId, lat, lng } = locationSchema.parse(req.body)
      const result = await deliveryService.pushLocation(req.user!.id, batchId, lat, lng)
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async track(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await deliveryService.getTracking(req.params.orderId, req.user!.id)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
}
