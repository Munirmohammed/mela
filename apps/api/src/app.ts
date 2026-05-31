import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'

import { env } from './config/env'
import { logger } from './utils/logger'
import { errorMiddleware } from './middleware/error.middleware'
import { initRealtime } from './realtime/socket'
import { metricsMiddleware } from './observability/metrics'
import healthRoutes from './observability/health'
import swaggerUi from 'swagger-ui-express'
import { openapiSpec } from './docs/openapi'

import authRoutes from './modules/auth/auth.routes'
import productsRoutes from './modules/products/products.routes'
import ordersRoutes from './modules/orders/orders.routes'
import creditRoutes from './modules/credit/credit.routes'
import adminRoutes from './modules/admin/admin.routes'
import paymentsRoutes from './modules/payments/payments.routes'
import deliveryRoutes from './modules/delivery/delivery.routes'
import shopsRoutes from './modules/shops/shops.routes'
import uploadsRoutes from './modules/uploads/uploads.routes'

const app = express()
const httpServer = createServer(app)

// Socket.io for live delivery tracking (Redis-adapter backed — scales across replicas).
export const io = initRealtime(httpServer)

// Security
app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

// Parsing — capture the raw body so payment webhooks can verify signatures.
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      ;(req as unknown as { rawBody?: Buffer }).rawBody = buf
    },
  })
)
app.use(express.urlencoded({ extended: true }))

// Logging — minimal format: METHOD /path HTTP/x.x STATUS size
app.use(morgan(':method :url HTTP/:http-version :status :res[content-length]', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}))

// Request metrics
app.use(metricsMiddleware)

// Health, readiness & Prometheus metrics (+ legacy /health alias)
app.use(healthRoutes)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mela-api', timestamp: new Date().toISOString() })
})

// API documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec as object))

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/orders', ordersRoutes)
app.use('/api/v1/credit', creditRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/payments', paymentsRoutes)
app.use('/api/v1/delivery', deliveryRoutes)
app.use('/api/v1/shops', shopsRoutes)
app.use('/api/v1/uploads', uploadsRoutes)

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Error handler
app.use(errorMiddleware)

export { httpServer }
export default app
