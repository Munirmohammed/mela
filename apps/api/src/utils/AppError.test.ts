import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from './AppError'

describe('AppError', () => {
  it('carries a status code and is operational by default', () => {
    const err = new AppError('boom', 418)
    expect(err.statusCode).toBe(418)
    expect(err.isOperational).toBe(true)
    expect(err).toBeInstanceOf(Error)
  })

  it('maps each subclass to the correct HTTP status', () => {
    expect(new NotFoundError('Shop').statusCode).toBe(404)
    expect(new NotFoundError('Shop').message).toBe('Shop not found')
    expect(new UnauthorizedError().statusCode).toBe(401)
    expect(new ForbiddenError().statusCode).toBe(403)
    expect(new ValidationError().statusCode).toBe(400)
    expect(new ConflictError().statusCode).toBe(409)
  })
})
