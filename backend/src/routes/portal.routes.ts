import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/errorHandler'
import {
  sendOrgRegistrationNotification,
  sendOrgApprovedEmail,
} from '../services/email.service'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

// ─── Middleware: проверка portal JWT ─────────────────────────────────────────

export interface PortalRequest extends Request {
  orgId?: string
}

function authenticatePortal(req: PortalRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) throw new AppError(401, 'Unauthorized')
    const payload = jwt.verify(token, JWT_SECRET) as any
    if (payload.type !== 'portal') throw new AppError(401, 'Invalid token type')
    req.orgId = payload.orgId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

// ─── POST /api/portal/register ────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, website, phone, description } = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      website: z.string().optional(),
      phone: z.string().optional(),
      description: z.string().optional(),
    }).parse(req.body)

    const existing = await prisma.organization.findUnique({ where: { email } })
    if (existing) throw new AppError(409, 'Email already registered')

    const passwordHash = await bcrypt.hash(password, 10)
    const org = await prisma.organization.create({
      data: { name, email, passwordHash, website, phone, description, status: 'active', approvedAt: new Date() },
    })

    // Отправляем приветственное письмо организации
    try {
      const { sendOrgApprovedEmail } = require('../services/email.service')
      await sendOrgApprovedEmail(org.email, org.name)
    } catch {}

    res.status(201).json({
      message: 'Registration successful! You can now login and create API keys.',
      orgId: org.id,
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/portal/login ───────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string(),
    }).parse(req.body)

    const org = await prisma.organization.findUnique({ where: { email } })
    if (!org) throw new AppError(401, 'Invalid email or password')

    const valid = await bcrypt.compare(password, org.passwordHash)
    if (!valid) throw new AppError(401, 'Invalid email or password')

    if (org.status === 'pending') {
      throw new AppError(403, 'Your application is pending approval. You will receive an email when approved.')
    }
    if (org.status === 'suspended') {
      throw new AppError(403, 'Your organization has been suspended. Contact support.')
    }

    const token = jwt.sign({ orgId: org.id, type: 'portal' }, JWT_SECRET, { expiresIn: '30d' })

    res.json({
      token,
      organization: {
        id: org.id, name: org.name, email: org.email,
        status: org.status, website: org.website,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/portal/me ───────────────────────────────────────────────────────

router.get('/me', authenticatePortal, async (req: PortalRequest, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.orgId },
      include: {
        apiKeys: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, name: true, isActive: true,
            createdAt: true, lastUsedAt: true, requestCount: true, revokedAt: true,
            // Ключ НЕ возвращаем — только при создании
          },
        },
      },
    })
    if (!org) throw new AppError(404, 'Organization not found')

    res.json({
      organization: {
        id: org.id, name: org.name, email: org.email,
        status: org.status, website: org.website,
        phone: org.phone, description: org.description,
        createdAt: org.createdAt,
      },
      apiKeys: org.apiKeys,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/portal/keys ─────────────────────────────────────────────────────

router.get('/keys', authenticatePortal, async (req: PortalRequest, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: req.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, isActive: true,
        createdAt: true, lastUsedAt: true, requestCount: true, revokedAt: true,
      },
    })
    res.json({ keys })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/portal/keys ────────────────────────────────────────────────────

router.post('/keys', authenticatePortal, async (req: PortalRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body)

    const org = await prisma.organization.findUnique({ where: { id: req.orgId } })
    if (!org) throw new AppError(404, 'Organization not found')
    if (org.status !== 'active') throw new AppError(403, 'Organization is not active')

    // Лимит: не более 5 активных ключей
    const activeCount = await prisma.apiKey.count({
      where: { organizationId: req.orgId!, isActive: true },
    })
    if (activeCount >= 5) throw new AppError(400, 'Maximum 5 active API keys allowed')

    // Генерируем безопасный случайный ключ
    const rawKey = `epx_${crypto.randomBytes(32).toString('hex')}`

    const apiKey = await prisma.apiKey.create({
      data: { key: rawKey, name, organizationId: req.orgId! },
    })

    // Возвращаем ПОЛНЫЙ ключ только при создании — потом он не доступен
    res.status(201).json({
      message: 'API key created. Save it now — it will not be shown again.',
      key: rawKey,
      id: apiKey.id,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
    })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/portal/keys/:id ─────────────────────────────────────────────

router.delete('/keys/:id', authenticatePortal, async (req: PortalRequest, res: Response, next: NextFunction) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id as string } })
    if (!key) throw new AppError(404, 'API key not found')
    if (key.organizationId !== req.orgId) throw new AppError(403, 'Access denied')

    await prisma.apiKey.update({
      where: { id: req.params.id as string },
      data: { isActive: false, revokedAt: new Date() },
    })

    res.json({ message: 'API key revoked' })
  } catch (err) {
    next(err)
  }
})

export default router
