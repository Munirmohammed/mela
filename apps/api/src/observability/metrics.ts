import client from 'prom-client'
import { Request, Response, NextFunction } from 'express'

export const registry = new client.Registry()
registry.setDefaultLabels({ service: 'mela-api' })
client.collectDefaultMetrics({ register: registry })

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
})

/** Times each request. Uses the coarse route (baseUrl) to keep label cardinality bounded. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const stop = httpDuration.startTimer()
  res.on('finish', () => {
    const route = req.baseUrl || req.path || 'unknown'
    stop({ method: req.method, route, status: String(res.statusCode) })
  })
  next()
}
