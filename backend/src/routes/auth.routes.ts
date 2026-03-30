import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/errorHandler'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password')
    }

    if (user.accountStatus === 'suspended') {
      throw new AppError(403, 'Account is suspended')
    }

    if (user.accountStatus === 'pending') {
      throw new AppError(403, 'Account is not activated yet. Check your email.')
    }

    // Обновляем lastActiveAt при логине — запускаем отсчёт сессии
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions,
    )

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/activate/:token — validate token, return user email
router.get('/activate/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params

    const user = await prisma.user.findUnique({
      where: { activationToken: token },
    })

    if (!user) throw new AppError(404, 'Invalid or expired activation link')
    if (user.accountStatus === 'active') {
      throw new AppError(400, 'Account already activated')
    }

    // Just return email so frontend can show it in the form
    res.json({ email: user.email, fullName: user.fullName })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/activate/:token — set password and activate account
router.post('/activate/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password || password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters')
    }

    const user = await prisma.user.findUnique({
      where: { activationToken: token },
    })

    if (!user) throw new AppError(404, 'Invalid or expired activation link')
    if (user.accountStatus === 'active') {
      throw new AppError(400, 'Account already activated')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        accountStatus: 'active',
        activationToken: null,
      },
    })

    res.json({ message: 'Account activated successfully. You can now log in.' })
  } catch (err) {
    next(err)
  }
})


// POST /api/auth/forgot-password — generate reset token
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body
    if (!email) throw new AppError(400, 'Email is required')

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success — don't reveal if email exists
    if (!user || user.accountStatus !== 'active') {
      return res.json({ message: 'If this email exists, a reset link has been sent.' })
    }

    const resetToken = require('crypto').randomUUID()
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    })

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
    console.log('\n========================================')
    console.log('PASSWORD RESET LINK (demo):')
    console.log(resetLink)
    console.log('========================================\n')

    res.json({ message: 'If this email exists, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/reset-password/:token — validate reset token
router.get('/reset-password/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const user = await prisma.user.findUnique({ where: { resetToken: token } })

    if (!user || !user.resetTokenExpiry) throw new AppError(404, 'Invalid or expired reset link')
    if (new Date() > user.resetTokenExpiry) throw new AppError(400, 'Reset link expired. Request a new one.')

    res.json({ email: user.email, fullName: user.fullName })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/reset-password/:token — set new password
router.post('/reset-password/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password || password.length < 8) throw new AppError(400, 'Password must be at least 8 characters')

    const user = await prisma.user.findUnique({ where: { resetToken: token } })

    if (!user || !user.resetTokenExpiry) throw new AppError(404, 'Invalid or expired reset link')
    if (new Date() > user.resetTokenExpiry) throw new AppError(400, 'Reset link expired. Request a new one.')

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    })

    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me  — текущий пользователь
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided')
    }

    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        accountStatus: true,
        createdAt: true,
      },
    })

    if (!user) throw new AppError(404, 'User not found')

    res.json({ user })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/auth/change-password
router.patch('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) throw new AppError(401, 'No token provided')
    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) throw new AppError(400, 'Fill in all fields')
    if (newPassword.length < 8) throw new AppError(400, 'Password must be at least 8 characters')

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) throw new AppError(404, 'User not found')

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new AppError(400, 'Current password is incorrect')

    const newHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
