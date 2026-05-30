import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { createAdapter } from '@socket.io/redis-adapter'
import { redis } from '../redis/client'
import { env } from '../config/env'
import { logger } from '../utils/logger'

let io: SocketServer | null = null

/**
 * Initialize realtime delivery tracking. The Redis adapter fans socket events
 * out across all API replicas, so a shop connected to replica A still receives
 * location updates emitted from replica B (or the worker).
 */
export function initRealtime(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  })

  const pub = redis.duplicate()
  const sub = redis.duplicate()
  io.adapter(createAdapter(pub, sub))

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`)
    socket.on('join-order', (orderId: string) => socket.join(`order:${orderId}`))
    socket.on('join-batch', (batchId: string) => socket.join(`batch:${batchId}`))
    socket.on('disconnect', () => logger.debug(`Socket disconnected: ${socket.id}`))
  })

  logger.info('🔌 Realtime (socket.io + Redis adapter) initialized')
  return io
}

export function getIo(): SocketServer | null {
  return io
}

export function emitToOrder(orderId: string, event: string, payload: unknown): void {
  io?.to(`order:${orderId}`).emit(event, payload)
}

export function emitToBatch(batchId: string, event: string, payload: unknown): void {
  io?.to(`batch:${batchId}`).emit(event, payload)
}
