import { Router } from 'express'
import { productsController } from './products.controller'
import { authenticate, requireAdmin } from '../../middleware/auth.middleware'
import { uploadSingleImage } from '../../middleware/upload.middleware'

const router = Router()

router.get('/', productsController.list)
router.get('/:id', productsController.getById)
router.post('/', authenticate, requireAdmin, productsController.create)
router.put('/:id', authenticate, requireAdmin, productsController.update)
router.patch('/:id/toggle', authenticate, requireAdmin, productsController.toggleAvailability)
router.patch('/:id/image', authenticate, requireAdmin, uploadSingleImage, productsController.setImage)

export default router
