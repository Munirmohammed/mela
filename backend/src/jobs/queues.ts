import { Queue } from 'bullmq'
import { redis } from '../redis/client'

const connection = redis

export const aggregationQueue = new Queue('order-aggregation', { connection })
export const routeQueue = new Queue('route-optimizer', { connection })
export const notificationQueue = new Queue('sms-notification', { connection })
export const creditQueue = new Queue('credit-recalc', { connection })
export const paymentRetryQueue = new Queue('payment-retry', { connection })
