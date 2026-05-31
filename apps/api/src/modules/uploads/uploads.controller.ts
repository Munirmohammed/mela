import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth.middleware'
import { AppError } from '../../utils/AppError'
import { storage } from './storage.service'

export const uploadsController = {
  async upload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as AuthRequest & { file?: Express.Multer.File }).file
      if (!file) throw new AppError('No file uploaded (form field "file")', 400)
      const folder = typeof req.body?.folder === 'string' ? req.body.folder : 'mela'
      const result = await storage.upload(file.buffer, { folder, mimetype: file.mimetype })
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },
}
