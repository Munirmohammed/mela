import 'dotenv/config'
import { initSentry } from './observability/sentry'

// Initialize error tracking before anything else can throw.
initSentry()

import { logger } from './utils/logger'
import { prisma } from './prisma/client'
import { setupScheduler } from './jobs/scheduler'

// Importing a job module registers its BullMQ worker.
import './jobs/aggregation.job'
import './jobs/notification.job'
import './jobs/payment-retry.job'
import { startOutboxProcessor } from './outbox/outbox.worker'

/**
 * Dedicated worker process. Runs the BullMQ workers and the cron scheduler
 * separately from the API so heavy jobs never block request handling. In
 * production the API runs with RUN_WORKERS_IN_API=false and this process owns
 * all queue consumption; in local dev the API runs workers in-process instead.
 */
async function bootstrap() {
  try {
    await prisma.$connect()
    await setupScheduler()
    startOutboxProcessor()
    logger.info('🛠️  Mela worker started — consuming queues + scheduler active')
  } catch (err: any) {
    logger.error('Worker failed to start', { err: err.message })
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, worker shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection in worker', { reason })
})

bootstrap()
