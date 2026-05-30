import * as Sentry from '@sentry/react'

/**
 * Initialize Sentry for the admin web app. No-ops unless `VITE_SENTRY_DSN` is
 * set at build time, so local dev runs without a DSN.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}
