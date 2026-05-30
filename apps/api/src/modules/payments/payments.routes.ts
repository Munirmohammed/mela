import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { paymentsController } from './payments.controller'

const router = Router()

// Public webhook — verified by the provider signature, mounted before auth.
router.post('/webhook', paymentsController.webhook)

router.use(authenticate)
router.post('/initiate', paymentsController.initiate)
router.post('/wallet/topup', paymentsController.topUp)
router.get('/wallet', paymentsController.wallet)
router.get('/wallet/transactions', paymentsController.walletTransactions)
router.get('/:id', paymentsController.getById)

export default router
