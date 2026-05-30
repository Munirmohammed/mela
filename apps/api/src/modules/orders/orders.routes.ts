import { Router } from 'express'
import { ordersController } from './orders.controller'
import { authenticate } from '../../middleware/auth.middleware'
import { idempotency } from '../../middleware/idempotency.middleware'

const router = Router()

router.use(authenticate)
router.post('/', idempotency('orders'), ordersController.place)
router.get('/', ordersController.list)
router.get('/:id', ordersController.getById)
router.delete('/:id', ordersController.cancel)

export default router
