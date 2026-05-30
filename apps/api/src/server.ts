import 'dotenv/config'
import { initSentry } from './observability/sentry'

// Initialize error tracking before anything else can throw.
initSentry()

import { httpServer } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { prisma } from './prisma/client'
import { redis } from './redis/client'
import { setupScheduler } from './jobs/scheduler'

// When true (the default for local dev), the API also runs the BullMQ workers
// and scheduler in-process. In production set RUN_WORKERS_IN_API=false and run
// the dedicated worker process (src/worker.ts) instead.
const runWorkersInApi = process.env.RUN_WORKERS_IN_API !== 'false'

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect()
    logger.info('✅ Database connected')

    if (runWorkersInApi) {
      // Importing a job module registers its BullMQ worker.
      await import('./jobs/aggregation.job')
      await import('./jobs/notification.job')
      await import('./jobs/payment-retry.job')
      await import('./jobs/route-optimizer.job')
      const { startOutboxProcessor } = await import('./outbox/outbox.worker')
      startOutboxProcessor()
      await setupScheduler()
      logger.info('🛠️  In-process workers + scheduler registered')
    } else {
      logger.info('Workers run in a dedicated process (RUN_WORKERS_IN_API=false)')
    }

    const PORT = Number(env.PORT)
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Mela API running on port ${PORT} [${env.NODE_ENV}]`)
    })
  } catch (err: any) {
    logger.error('Failed to start server', { err: err.message })
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  redis.disconnect()
  process.exit(0)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason })
})

bootstrap()
