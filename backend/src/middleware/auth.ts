import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'
import { AppError } from './errorHandler'

export interface AuthRequest extends Request {
    user?: {
        userId: string
        role: UserRole
    }
}

// Проверяет JWT токен
export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
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
        req.user = payload
        next()
    } catch {
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