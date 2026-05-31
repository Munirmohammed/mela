import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { shopsController } from './shops.controller'

const router = Router()
router.use(authenticate)

router.get('/me', shopsController.me)
router.put('/me', shopsController.update)

export default router
