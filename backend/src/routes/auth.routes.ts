import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/errorHandler'
import { sendActivationEmail, sendPasswordResetEmail, sendOtpEmail } from '../services/email.service'

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


// POST /api/auth/request-change — request email or phone change via OTP
router.post('/request-change', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) throw new AppError(401, 'No token provided')
    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const { field, newValue } = req.body

    if (!field || !['email', 'phone'].includes(field)) {
      throw new AppError(400, 'Field must be email or phone')
    }
    if (!newValue || !newValue.trim()) {
      throw new AppError(400, 'New value is required')
    }

    // Check email uniqueness
    if (field === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
        throw new AppError(400, 'Invalid email format')
      }
      const existing = await prisma.user.findUnique({ where: { email: newValue } })
      if (existing) throw new AppError(400, 'This email is already in use')
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        otpCode,
        otpExpiry,
        otpField: field,
        ...(field === 'email' ? { pendingEmail: newValue } : { pendingPhone: newValue }),
      },
    })

    console.log('\n========================================')
    console.log(`OTP CODE for ${field} change (demo):`)
    console.log(`New ${field}: ${newValue}`)
    console.log(`OTP: ${otpCode}`)
    console.log('(expires in 10 minutes)')
    console.log('========================================\n')

    res.json({ message: `Verification code sent to ${newValue}` })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/confirm-change — verify OTP and apply change
router.post('/confirm-change', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) throw new AppError(401, 'No token provided')
    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const { code } = req.body
    if (!code) throw new AppError(400, 'Verification code is required')

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) throw new AppError(404, 'User not found')

    if (!user.otpCode || !user.otpExpiry || !user.otpField) {
      throw new AppError(400, 'No pending change request. Please request a new code.')
    }

    if (new Date() > user.otpExpiry) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiry: null, otpField: null, pendingEmail: null, pendingPhone: null },
      })
      throw new AppError(400, 'Verification code has expired. Please request a new one.')
    }

    if (user.otpCode !== code.toString()) {
      throw new AppError(400, 'Invalid verification code')
    }

    // Apply the change
    const updateData: any = {
      otpCode: null,
      otpExpiry: null,
      otpField: null,
      pendingEmail: null,
      pendingPhone: null,
    }

    if (user.otpField === 'email' && user.pendingEmail) {
      updateData.email = user.pendingEmail
    } else if (user.otpField === 'phone' && user.pendingPhone) {
      updateData.phone = user.pendingPhone
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { id: true, fullName: true, email: true, phone: true, role: true, accountStatus: true },
    })

    res.json({
      message: `${user.otpField === 'email' ? 'Email' : 'Phone'} updated successfully`,
      user: updated,
    })
  } catch (err) {
    next(err)
  }
})

export default router
