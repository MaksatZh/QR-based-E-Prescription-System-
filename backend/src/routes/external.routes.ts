import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/errorHandler'
import { authenticateApiKey, ApiRequest } from '../middleware/apiKeyAuth'
import { sendPrescriptionEmail } from '../services/email.service'
import QRCode from 'qrcode'


const router = Router()

// Все роуты защищены API ключом
router.use(authenticateApiKey)

// ─── POST /api/external/prescriptions ────────────────────────────────────────
// Создать рецепт из внешней системы

router.post('/prescriptions', async (req: ApiRequest, res: Response, next: NextFunction) => {
  try {
    const body = z.object({
      patientIin: z.string().length(12),
      patientName: z.string().min(1),
      patientPhone: z.string().min(1),
      patientEmail: z.string().email(),
      diagnosisCode: z.string().optional(),
      diagnosisName: z.string().optional(),
      doctorName: z.string().optional(),
      medications: z.array(z.object({
        name: z.string().min(1),
        dosage: z.string().min(1),
        form: z.string().default('other'),
        quantity: z.number().int().positive(),
        course: z.string().default(''),
      })).min(1),
    }).parse(req.body)

    // Найти или создать пациента
    let patient = await prisma.patient.findFirst({ where: { iin: body.patientIin } })
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          fullName: body.patientName,
          iin: body.patientIin,
          phone: body.patientPhone,
          email: body.patientEmail,
        },
      })
    }

    // Нужен системный доктор для внешних рецептов
    // Используем первого активного врача или создаём системную запись
    let systemDoctor = await prisma.user.findFirst({
      where: { role: 'doctor', accountStatus: 'active' },
    })
    if (!systemDoctor) throw new AppError(500, 'No active doctors found in system')

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const prescription = await prisma.prescription.create({
      data: {
        patientId: patient.id,
        doctorId: systemDoctor.id,
        status: 'active',
        expiresAt,
        diagnosisCode: body.diagnosisCode || null,
        diagnosisName: body.diagnosisName || null,
        notes: `Created via API by ${req.organization.name}`,
        medications: {
          create: body.medications.map(m => ({
            name: m.name,
            form: m.form,
            dosage: m.dosage,
            qtyPrescribed: m.quantity,
            course: m.course,
            qtyDispensed: 0,
          })),
        },
      },
      include: { medications: true },
    })

    // Отправить email пациенту
    try {
      await sendPrescriptionEmail(
        patient.email,
        patient.fullName,
        body.doctorName || req.organization.name,
        prescription.id,
        prescription.medications.map(m => ({
          name: m.name, dosage: m.dosage, qtyPrescribed: m.qtyPrescribed,
        }))
      )
    } catch {}

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

    res.status(201).json({
      success: true,
      prescriptionId: prescription.id,
      qrUrl: `${frontendUrl}/patient/${prescription.id}`,
      expiresAt: prescription.expiresAt,
      patient: {
        iin: patient.iin,
        fullName: patient.fullName,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/external/prescriptions/:id ─────────────────────────────────────
// Получить статус рецепта

router.get('/prescriptions/:id', async (req: ApiRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id as string },
      include: {
        patient: { select: { fullName: true, iin: true, phone: true, email: true } },
        medications: {
          select: {
            id: true, name: true, dosage: true, form: true,
            qtyPrescribed: true, qtyDispensed: true, course: true,
          },
        },
      },
    }) as any

    if (!prescription) throw new AppError(404, 'Prescription not found')

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

    res.json({
      id: prescription.id,
      status: prescription.status,
      createdAt: prescription.createdAt,
      expiresAt: prescription.expiresAt,
      qrUrl: `${frontendUrl}/patient/${prescription.id}`,
      patient: prescription.patient,
      medications: prescription.medications.map(m => ({
        ...m,
        qtyRemaining: m.qtyPrescribed - m.qtyDispensed,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/external/patients/:iin ─────────────────────────────────────────
// Найти пациента по ИИН

router.get('/patients/:iin', async (req: ApiRequest, res: Response, next: NextFunction) => {
  try {
    const { iin } = req.params
    if (iin.length !== 12) throw new AppError(400, 'IIN must be 12 digits')

    const patient = await prisma.patient.findFirst({
      where: { iin: req.params.iin as string },
      select: { id: true, fullName: true, iin: true, phone: true, email: true, createdAt: true },
    })

    if (!patient) {
      return res.json({ found: false, patient: null })
    }

    // Активные рецепты пациента
    const activeCount = await prisma.prescription.count({
      where: { patientId: patient.id, status: { in: ['active', 'partially_dispensed'] } },
    })

    res.json({
      found: true,
      patient: { ...patient, activePrescriptions: activeCount },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/external/prescriptions/:id/qr ──────────────────────────────────
// Получить QR код рецепта

router.get('/prescriptions/:id/qr', async (req: ApiRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, status: true },
    })
    if (!prescription) throw new AppError(404, 'Prescription not found')

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const patientUrl = `${frontendUrl}/patient/${prescription.id}`
    const qrDataUrl = await QRCode.toDataURL(patientUrl)

    res.json({ qrDataUrl, patientUrl, status: prescription.status })
  } catch (err) {
    next(err)
  }
})

export default router
