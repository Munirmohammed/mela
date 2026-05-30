import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'
import { env } from '../config/env'
import { captureException } from '../observability/sentry'

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const meta = {
    method: req.method,
    path:   req.path,
    ip:     req.ip,
    body:   sanitizeBody(req.body),
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    logger.warn('Validation failed', { ...meta, errors })
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  // Known operational errors
  if (err instanceof AppError) {
    const logFn = err.statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger)
    logFn(`${err.statusCode} ${err.message}`, meta)
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
  }

  // Unknown / unexpected errors
  logger.error('Unhandled error', { ...meta, err: err.message, stack: err.stack })
  captureException(err)

  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}

/** Strip sensitive fields before logging */
function sanitizeBody(body: Record<string, any> = {}) {
  const { password, token, refreshToken, code, ...safe } = body
  return safe
}
