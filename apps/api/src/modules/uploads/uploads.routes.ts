import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { uploadSingleImage } from '../../middleware/upload.middleware'
import { uploadsController } from './uploads.controller'

const router = Router()

// Authenticated image upload used by admins (product images) and drivers (POD photos).
router.post('/', authenticate, uploadSingleImage, uploadsController.upload)

export default router
