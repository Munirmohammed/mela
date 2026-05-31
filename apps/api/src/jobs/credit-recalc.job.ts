import { Worker, Job } from 'bullmq'
import { redis } from '../redis/client'
import { logger } from '../utils/logger'
import { creditService } from '../modules/credit/credit.service'

/** Recomputes a shop's credit score + limit. Enqueued after every delivery. */
export const creditRecalcWorker = new Worker(
  'credit-recalc',
  async (job: Job) => {
    const { shopId } = job.data as { shopId: string }
    await creditService.recalculate(shopId)
    logger.info(`Credit recalculated for shop ${shopId}`)
  },
  { connection: redis }
)

creditRecalcWorker.on('failed', (job, err) => {
  logger.warn(`Credit recalc job ${job?.id} failed`, { err: err.message })
})
