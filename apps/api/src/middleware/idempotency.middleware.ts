import { Response, NextFunction } from 'express'
import { redisCache } from '../redis/client'
import { AuthRequest } from './auth.middleware'

/**
 * Redis-backed idempotency for mutating routes. If a request carries an
 * `Idempotency-Key`, the first response is cached and replayed for retries with
 * the same key; a concurrent retry while the first is in flight gets 409.
 * No key → pass through unchanged. Redis failures never block the request.
 */
export function idempotency(prefix: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.header('Idempotency-Key')
    if (!key) return next()

    const scope = req.user?.id ?? 'anon'
    const cacheKey = `idem:${prefix}:${scope}:${key}`
    const lockKey = `${cacheKey}:lock`

    try {
      const cached = await redisCache.get(cacheKey)
      if (cached) {
        const { status, body } = JSON.parse(cached)
        return res.status(status).json(body)
      }
      const lock = await redisCache.set(lockKey, '1', 'EX', 30, 'NX')
      if (!lock) {
        return res.status(409).json({ success: false, message: 'Duplicate request in progress' })
      }
    } catch {
      return next() // Redis unavailable — fail open rather than block writes.
    }

    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      if (res.statusCode < 500) {
        redisCache.set(cacheKey, JSON.stringify({ status: res.statusCode, body }), 'EX', 86400).catch(() => {})
      }
      redisCache.del(lockKey).catch(() => {})
      return originalJson(body)
    }
    next()
  }
}
