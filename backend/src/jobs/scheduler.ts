import { aggregationQueue } from './queues'
import { Zone } from '@prisma/client'
import { logger } from '../utils/logger'

const ZONES = Object.values(Zone)

export async function setupScheduler() {
  // Remove existing repeatable jobs to avoid duplicates
  const repeatableJobs = await aggregationQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    await aggregationQueue.removeRepeatableByKey(job.key)
  }

  // Schedule aggregation for each zone at 9PM EAT (UTC+3 = 18:00 UTC)
  for (const zone of ZONES) {
    await aggregationQueue.add(
      `aggregate-${zone}`,
      { zone, windowDate: new Date().toISOString() },
      {
        repeat: { cron: '0 18 * * *' }, // 9PM EAT = 6PM UTC
        jobId: `aggregate-${zone}`,
      }
    )
    logger.info(`📅 Scheduled aggregation for zone: ${zone}`)
  }

  logger.info('✅ All zone schedulers set up')
}
