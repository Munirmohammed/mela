import * as Sentry from '@sentry/node'
import { logger } from '../utils/logger'

let enabled = false

/**
 * Initialize Sentry error tracking. No-ops when `SENTRY_DSN` is unset, so local
 * development and tests never need a DSN. Call once, as early as possible.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    logger.info('Sentry disabled (SENTRY_DSN not set)')
    return
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  })
  enabled = true
  logger.info('Sentry initialized')
}

/** Report an exception to Sentry if enabled; otherwise a no-op. */
export function captureException(err: unknown): void {
  if (enabled) Sentry.captureException(err)
}
