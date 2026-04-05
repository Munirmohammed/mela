import { Redis } from 'ioredis'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})

redis.on('connect', () => logger.info('✅ Redis connected'))
redis.on('error', (err) => logger.error('Redis error', { err: err.message }))

export const redisCache = new Redis(env.REDIS_URL)

// Helper: cache with TTL
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redisCache.get(key)
  if (cached) return JSON.parse(cached) as T
  const data = await fetcher()
  await redisCache.setex(key, ttlSeconds, JSON.stringify(data))
  return data
}

export async function invalidate(key: string) {
  await redisCache.del(key)
}
