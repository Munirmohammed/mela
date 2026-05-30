import { Worker, Job } from 'bullmq'
import { redis } from '../redis/client'
import { logger } from '../utils/logger'
import { paymentsService } from '../modules/payments/payments.service'

/**
 * Safety net for missed/late Chapa webhooks: re-verify a payment against the
 * gateway and settle it if it succeeded. Enqueued (delayed) on CHAPA initiate.
 */
export const paymentRetryWorker = new Worker(
  'payment-retry',
  async (job: Job) => {
    const { paymentId } = job.data as { paymentId: string }
    const payment = await paymentsService.verifyAndReconcile(paymentId)
    logger.info('Payment retry processed', { paymentId, status: payment?.status })
    return { status: payment?.status }
  },
  { connection: redis }
)

paymentRetryWorker.on('failed', (job, err) => {
  logger.warn(`Payment retry job ${job?.id} failed`, { err: err.message })
})
