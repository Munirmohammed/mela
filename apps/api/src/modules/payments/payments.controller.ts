import { Response, NextFunction } from 'express'
import { prisma } from '../../prisma/client'
import { AuthRequest } from '../../middleware/auth.middleware'
import { AppError, NotFoundError } from '../../utils/AppError'
import { paymentsService } from './payments.service'
import { walletService } from './wallet.service'
import { initiatePaymentSchema, topUpSchema } from './payments.schema'

async function requireShop(userId: string) {
  const shop = await prisma.shop.findUnique({ where: { userId } })
  if (!shop) throw new NotFoundError('Shop')
  return shop
}

function requireIdempotencyKey(req: AuthRequest): string {
  const key = req.header('Idempotency-Key')
  if (!key) throw new AppError('Idempotency-Key header is required', 400)
  return key
}

export const paymentsController = {
  async initiate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dto = initiatePaymentSchema.parse(req.body)
      const idempotencyKey = requireIdempotencyKey(req)
      const shop = await requireShop(req.user!.id)
      const result = await paymentsService.initiate({
        shopId: shop.id,
        purpose: dto.purpose,
        method: dto.method,
        orderId: dto.orderId,
        amount: dto.amount,
        idempotencyKey,
        contact: { phone: shop.phone, firstName: shop.ownerName },
      })
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async topUp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dto = topUpSchema.parse(req.body)
      const idempotencyKey = requireIdempotencyKey(req)
      const shop = await requireShop(req.user!.id)
      const result = await paymentsService.initiate({
        shopId: shop.id,
        purpose: 'WALLET_TOPUP',
        method: 'CHAPA',
        amount: dto.amount,
        idempotencyKey,
        contact: { phone: shop.phone, firstName: shop.ownerName },
      })
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  // Public — authenticated by the provider signature, not a JWT.
  async webhook(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const raw = (req as unknown as { rawBody?: Buffer }).rawBody
      const signature = req.header('Chapa-Signature') ?? req.header('x-chapa-signature')
      const body = raw ?? Buffer.from(JSON.stringify(req.body ?? {}))
      const result = await paymentsService.handleWebhook(body, signature)
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async wallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const shop = await requireShop(req.user!.id)
      res.json({ success: true, data: await walletService.getBalance(shop.id) })
    } catch (err) {
      next(err)
    }
  },

  async walletTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const shop = await requireShop(req.user!.id)
      res.json({ success: true, data: await walletService.getTransactions(shop.id) })
    } catch (err) {
      next(err)
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const shop = await requireShop(req.user!.id)
      res.json({ success: true, data: await paymentsService.getById(req.params.id, shop.id) })
    } catch (err) {
      next(err)
    }
  },
}
