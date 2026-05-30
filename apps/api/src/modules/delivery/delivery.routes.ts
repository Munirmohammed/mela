import { Router } from 'express'
import { authenticate, requireDriver } from '../../middleware/auth.middleware'
import { deliveryController } from './delivery.controller'

const router = Router()
router.use(authenticate)

// Shop owner — live tracking for one of their orders.
router.get('/track/:orderId', deliveryController.track)

// Driver app.
router.get('/batch', requireDriver, deliveryController.myBatch)
router.post('/batches/:id/start', requireDriver, deliveryController.start)
router.post('/stops/:id/arrive', requireDriver, deliveryController.arrive)
router.post('/stops/:id/deliver', requireDriver, deliveryController.deliver)
router.post('/location', requireDriver, deliveryController.pushLocation)

export default router
