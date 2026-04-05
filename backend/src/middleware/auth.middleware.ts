import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { UnauthorizedError, ForbiddenError } from '../utils/AppError'
import { prisma } from '../prisma/client'
import { Role } from '@prisma/client'

export interface AuthRequest extends Request {
  user?: { id: string; phone: string; role: Role }
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) throw new UnauthorizedError('No token provided')

    const payload = jwt.verify(token, env.JWT_SECRET) as {
      id: string
      phone: string
      role: Role
    }
    req.user = payload
    next()
  } catch {
    next(new UnauthorizedError('Invalid or expired token'))
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'))
    }
    next()
  }
}

export const requireAdmin = requireRole(Role.ADMIN)
export const requireDriver = requireRole(Role.DRIVER, Role.ADMIN)
