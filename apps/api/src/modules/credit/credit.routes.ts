import { Router } from 'express'
import { creditService } from './credit.service'
import { authenticate } from '../../middleware/auth.middleware'
import { AuthRequest } from '../../middleware/auth.middleware'
import { NextFunction, Response } from 'express'

const router = Router()
router.use(authenticate)

router.get('/score', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await creditService.getScore(req.user!.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.post('/apply', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body
    const loan = await creditService.applyForLoan(req.user!.id, Number(amount))
    res.status(201).json({ success: true, data: loan })
  } catch (err) { next(err) }
})

router.post('/repay/:loanId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const loan = await creditService.repayLoan(req.user!.id, req.params.loanId)
    res.json({ success: true, data: loan })
  } catch (err) { next(err) }
})

export default router
