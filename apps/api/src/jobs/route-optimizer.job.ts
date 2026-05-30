import { Worker, Job } from 'bullmq'
import { redis } from '../redis/client'
import { logger } from '../utils/logger'
import { deliveryService } from '../modules/delivery/delivery.service'

/** Builds the optimized stop sequence for a batch after it is aggregated. */
export const routeOptimizerWorker = new Worker(
  'route-optimizer',
  async (job: Job) => {
    const { batchId } = job.data as { batchId: string }
    const stops = await deliveryService.buildRoute(batchId)
    logger.info(`Route optimizer built ${stops.length} stops for batch ${batchId}`)
    return { stops: stops.length }
  },
  { connection: redis }
)

routeOptimizerWorker.on('failed', (job, err) => {
  logger.error(`Route optimizer job ${job?.id} failed`, { err: err.message })
})
