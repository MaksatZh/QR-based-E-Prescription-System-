import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'
import { AppError } from './errorHandler'
import { prisma } from '../prisma/client'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    role: UserRole
  }
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000  // 30 минут

// Проверяет JWT токен + время последней активности
export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'No token provided'))
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      role: UserRole
    }

    // Проверяем пользователя и время последней активности
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, accountStatus: true, lastActiveAt: true }
    })

    if (!user) {
      return next(new AppError(401, 'User not found'))
    }

    if (user.accountStatus === 'suspended') {
      return next(new AppError(403, 'Account is suspended'))
    }

    // Проверяем session timeout — если lastActiveAt есть и прошло > 30 минут
    if (user.lastActiveAt) {
      const elapsed = Date.now() - new Date(user.lastActiveAt).getTime()
      if (elapsed > SESSION_TIMEOUT_MS) {
        return next(new AppError(401, 'Session expired due to inactivity. Please log in again.'))
      }
    }

    // Обновляем lastActiveAt — фиксируем время активности
    await prisma.user.update({
      where: { id: payload.userId },
      data: { lastActiveAt: new Date() }
    })

    req.user = { userId: payload.userId, role: payload.role }
    next()
  } catch (err: any) {
    if (err instanceof AppError) return next(err)
    next(new AppError(401, 'Invalid or expired token'))
  }
}

// Проверяет что роль пользователя входит в список разрешённых
export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Not authenticated'))
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Access denied'))
    }
    next()
  }
}
