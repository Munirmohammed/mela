import { Router, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/auth.middleware'
import { prisma } from '../../prisma/client'
import { NotFoundError } from '../../utils/AppError'
import { loyaltyService } from './loyalty.service'

const router = Router()
router.use(authenticate)

// Current shop's loyalty account + recent points ledger.
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { userId: req.user!.id } })
    if (!shop) throw new NotFoundError('Shop')
    const account = await loyaltyService.getAccount(shop.id)
    res.json({ success: true, data: account })
  } catch (err) {
    next(err)
  }
})

export default router
