import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../prisma/client'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAction } from '../services/audit.service'

const router = Router()

const createUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  role: z.enum(['doctor', 'pharmacist', 'admin', 'super_admin']),
})

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  role: z.enum(['doctor', 'pharmacist', 'admin', 'super_admin']).optional(),
})

// GET /api/admin/users
router.get('/users', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query
    const isSuperAdmin = req.user!.role === 'super_admin'

    const users = await prisma.user.findMany({
      where: {
        // Обычный admin не видит других admin и super_admin
        ...(isSuperAdmin ? {} : { role: { in: ['doctor', 'pharmacist'] } }),
        ...(search ? {
          OR: [
            { fullName: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, accountStatus: true, activationToken: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ users })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/users — создать пользователя
router.post('/users', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body)
    const isSuperAdmin = req.user!.role === 'super_admin'

    if (!isSuperAdmin && (data.role === 'admin' || data.role === 'super_admin')) {
      throw new AppError(403, 'Only super admin can create admin accounts')
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'Email already in use')

    const activationToken = crypto.randomBytes(32).toString('hex')
    const tempPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10)

    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash: tempPasswordHash,
        accountStatus: 'pending',
        activationToken,
        createdById: req.user!.userId,
      },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, accountStatus: true, activationToken: true, createdAt: true,
      },
    })

    await logAction(req.user!.userId, 'CREATE_USER', 'User', user.id,
      `Created user ${data.email} with role ${data.role}`)

    const activationLink = `${process.env.FRONTEND_URL}/activate/${activationToken}`
    console.log(`📧 Activation link for ${data.email}: ${activationLink}`)

    res.status(201).json({ user, activationLink })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/users/:id — обновить пользователя
router.patch('/users/:id', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateUserSchema.parse(req.body)
    const isSuperAdmin = req.user!.role === 'super_admin'

    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) throw new AppError(404, 'User not found')

    if (!isSuperAdmin && (target.role === 'admin' || target.role === 'super_admin')) {
      throw new AppError(403, 'No permission to edit admin accounts')
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, accountStatus: true, createdAt: true,
      },
    })

    await logAction(req.user!.userId, 'UPDATE_USER', 'User', user.id,
      `Updated user ${user.email}`)

    res.json({ user })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/users/:id/toggle — заблокировать / разблокировать
router.patch('/users/:id/toggle', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user!.userId) {
      throw new AppError(400, 'Cannot deactivate yourself')
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) throw new AppError(404, 'User not found')

    const isSuperAdmin = req.user!.role === 'super_admin'
    if (!isSuperAdmin && (target.role === 'admin' || target.role === 'super_admin')) {
      throw new AppError(403, 'No permission')
    }

    const newStatus = target.accountStatus === 'active' ? 'suspended' : 'active'

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { accountStatus: newStatus },
      select: { id: true, fullName: true, email: true, accountStatus: true },
    })

    await logAction(req.user!.userId, newStatus === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      'User', user.id, `User ${user.email} set to ${newStatus}`)

    res.json({ user })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/audit-logs
router.get('/audit-logs', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entityType, userId, limit = '50' } = req.query

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entityType ? { entityType: entityType as string } : {}),
        ...(userId ? { userId: userId as string } : {}),
      },
      include: {
        user: { select: { fullName: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    })

    res.json({ logs })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/stats — статистика для дашборда
router.get('/stats', authenticate, authorize('admin', 'super_admin'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalPrescriptions, activeRx, dispensedRx, cancelledRx] = await Promise.all([
      prisma.user.count(),
      prisma.prescription.count(),
      prisma.prescription.count({ where: { status: { in: ['active', 'created'] } } }),
      prisma.prescription.count({ where: { status: 'dispensed' } }),
      prisma.prescription.count({ where: { status: 'cancelled' } }),
    ])

    res.json({ totalUsers, totalPrescriptions, activeRx, dispensedRx, cancelledRx })
  } catch (err) {
    next(err)
  }
})

export default router
