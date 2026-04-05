import 'dotenv/config'
import { httpServer } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { prisma } from './prisma/client'
import { redis } from './redis/client'
import { setupScheduler } from './jobs/scheduler'

// Import workers to register them
import './jobs/aggregation.job'
import './jobs/notification.job'

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect()
    logger.info('✅ Database connected')

    // Setup BullMQ cron schedulers
    await setupScheduler()

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
