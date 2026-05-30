import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'

import { env } from './config/env'
import { logger } from './utils/logger'
import { errorMiddleware } from './middleware/error.middleware'

import authRoutes from './modules/auth/auth.routes'
import productsRoutes from './modules/products/products.routes'
import ordersRoutes from './modules/orders/orders.routes'
import creditRoutes from './modules/credit/credit.routes'
import adminRoutes from './modules/admin/admin.routes'
import paymentsRoutes from './modules/payments/payments.routes'

const app = express()
const httpServer = createServer(app)

// Socket.io for live tracking
export const io = new SocketServer(httpServer, {
  cors: { origin: env.FRONTEND_URL, credentials: true },
})

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`)

  socket.on('join-order', (orderId: string) => {
    socket.join(`order:${orderId}`)
  })

  socket.on('driver-location', (data: { batchId: string; lat: number; lng: number }) => {
    io.to(`batch:${data.batchId}`).emit('location-update', { lat: data.lat, lng: data.lng })
  })

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`)
  })
})

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

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mela-api', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/orders', ordersRoutes)
app.use('/api/v1/credit', creditRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/payments', paymentsRoutes)

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Error handler
app.use(errorMiddleware)

export { httpServer }
export default app
