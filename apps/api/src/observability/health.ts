import { Router, Request, Response } from 'express'
import { prisma } from '../prisma/client'
import { redis } from '../redis/client'
import { registry } from './metrics'

const router = Router()

/** Liveness — the process is up. */
router.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'mela-api', timestamp: new Date().toISOString() })
})

/** Readiness — dependencies (DB + Redis) are reachable. */
router.get('/readyz', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'fail'> = { db: 'fail', redis: 'fail' }
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.db = 'ok'
  } catch {
    /* leave as fail */
  }
  try {
    const pong = await redis.ping()
    if (pong === 'PONG') checks.redis = 'ok'
  } catch {
    /* leave as fail */
  }
  const ready = checks.db === 'ok' && checks.redis === 'ok'
  res.status(ready ? 200 : 503).json({ ready, checks })
})

/** Prometheus metrics. */
router.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType)
  res.send(await registry.metrics())
})

export default router
