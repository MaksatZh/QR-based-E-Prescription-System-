import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAction } from '../services/audit.service'
import { sendPrescriptionEmail } from '../services/email.service'
import { recalcPrescriptionStatus } from '../services/prescription.service'

const router = Router()

// ─── Validation schemas ───────────────────────────────────────────────────────

const medicationSchema = z.object({
  name: z.string().min(1),
  form: z.enum(['tablets', 'capsules', 'ampoules', 'syrup', 'drops', 'ointment', 'injection', 'other']),
  dosage: z.string().min(1),
  qtyPrescribed: z.number().int().positive(),
  course: z.string().min(1),
})

const createPrescriptionSchema = z.object({
  patient: z.object({
    fullName: z.string().min(1),
    iin: z.string().length(12),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
  medications: z.array(medicationSchema).min(1),
})

const editPrescriptionSchema = z.object({
  medications: z.array(z.object({
    id: z.string().optional(),        // если есть id — редактируем, нет — добавляем новую
    name: z.string().min(1).optional(),
    form: z.enum(['tablets', 'capsules', 'ampoules', 'syrup', 'drops', 'ointment', 'injection', 'other']).optional(),
    dosage: z.string().min(1).optional(),
    qtyPrescribed: z.number().int().positive().optional(),
    course: z.string().min(1).optional(),
  })).optional(),
})

// ─── GET /api/prescriptions — список рецептов врача ──────────────────────────

router.get('/', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query

    const prescriptions = await prisma.prescription.findMany({
      where: {
        doctorId: req.user!.userId,
        ...(status ? { status: status as any } : {}),
        ...(search ? {
          OR: [
            { patient: { fullName: { contains: search as string, mode: 'insensitive' } } },
            { patient: { iin: { contains: search as string } } },
            { id: { contains: search as string, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        patient: true,
        medications: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ prescriptions })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/prescriptions/:id — детали рецепта ─────────────────────────────

router.get('/:id', authenticate, authorize('doctor', 'pharmacist'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        medications: true,
        doctor: { select: { id: true, fullName: true, email: true } },
        dispenseEvents: {
          include: { items: true, pharmacist: { select: { id: true, fullName: true } } },
          orderBy: { timestamp: 'desc' },
        },
      },
    })

    if (!prescription) throw new AppError(404, 'Prescription not found')

    // Врач видит только свои рецепты
    if (req.user!.role === 'doctor' && prescription.doctorId !== req.user!.userId) {
      throw new AppError(403, 'Access denied')
    }

    res.json({ prescription })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/prescriptions — создать рецепт ────────────────────────────────

router.post('/', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patient, medications } = createPrescriptionSchema.parse(req.body)

    const validityDays = parseInt(process.env.PRESCRIPTION_VALIDITY_DAYS || '30')
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)

    // Найти или создать пациента по ИИН
    let patientRecord = await prisma.patient.findFirst({ where: { iin: patient.iin } })
    if (!patientRecord) {
      patientRecord = await prisma.patient.create({ data: patient })
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId: patientRecord.id,
        doctorId: req.user!.userId,
        status: 'active',
        expiresAt,
        medications: {
          create: medications.map(m => ({ ...m, qtyDispensed: 0 })),
        },
      },
      include: { patient: true, medications: true },
    })

    await logAction(req.user!.userId, 'CREATE_PRESCRIPTION', 'Prescription', prescription.id,
      `Created prescription for patient ${patient.fullName} (IIN: ${patient.iin})`,
      prescription.id,
    )

    // Send prescription link to patient email
    try {
      const doctor = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { fullName: true },
      })
      await sendPrescriptionEmail(
        patientRecord.email,
        patientRecord.fullName,
        doctor?.fullName || 'Врач',
        prescription.id,
        prescription.medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          qtyPrescribed: m.qtyPrescribed,
        }))
      )
      console.log('Prescription email sent to:', patientRecord.email)
    } catch (emailErr) {
      console.error('Failed to send prescription email:', emailErr)
      // Don't fail the request if email fails
    }

    res.status(201).json({ prescription })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/prescriptions/:id — редактировать рецепт ─────────────────────

router.patch('/:id', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
      include: { medications: true },
    })

    if (!prescription) throw new AppError(404, 'Prescription not found')
    if (prescription.doctorId !== req.user!.userId) throw new AppError(403, 'Access denied')
    if (['dispensed', 'cancelled', 'expired'].includes(prescription.status)) {
      throw new AppError(400, 'Cannot edit this prescription')
    }

    const { medications } = editPrescriptionSchema.parse(req.body)

    if (medications) {
      for (const med of medications) {
        if (med.id) {
          // Редактируем существующую позицию
          const existing = prescription.medications.find(m => m.id === med.id)
          if (!existing) throw new AppError(404, `Medication ${med.id} not found`)

          // После частичного отпуска нельзя МЕНЯТЬ препарат/форму/дозировку
          // Проверяем только если значение реально отличается от существующего
          if (prescription.status === 'partially_dispensed' && existing.qtyDispensed > 0) {
            const nameChanged   = med.name   && med.name   !== existing.name
            const formChanged   = med.form   && med.form   !== existing.form
            const dosageChanged = med.dosage && med.dosage !== existing.dosage
            if (nameChanged || formChanged || dosageChanged) {
              throw new AppError(400, `Cannot change drug/form/dosage for medication "${existing.name}" — it was already partially dispensed`)
            }
          }

          // Нельзя уменьшить количество меньше уже выданного
          if (med.qtyPrescribed !== undefined && med.qtyPrescribed < existing.qtyDispensed) {
            throw new AppError(400, `Cannot set qty below already dispensed (${existing.qtyDispensed}) for "${existing.name}"`)
          }

          await prisma.prescriptionItem.update({
            where: { id: med.id },
            data: {
              ...(med.name && { name: med.name }),
              ...(med.form && { form: med.form }),
              ...(med.dosage && { dosage: med.dosage }),
              ...(med.qtyPrescribed !== undefined && { qtyPrescribed: med.qtyPrescribed }),
              ...(med.course && { course: med.course }),
            },
          })
        } else {
          // Добавляем новую позицию
          await prisma.prescriptionItem.create({
            data: {
              prescriptionId: prescription.id,
              name: med.name!,
              form: med.form!,
              dosage: med.dosage!,
              qtyPrescribed: med.qtyPrescribed!,
              course: med.course!,
              qtyDispensed: 0,
            },
          })
        }
      }
    }

    await logAction(req.user!.userId, 'EDIT_PRESCRIPTION', 'Prescription', prescription.id,
      'Prescription edited', prescription.id)

    const updated = await prisma.prescription.findUnique({
      where: { id: prescription.id },
      include: { patient: true, medications: true },
    })

    res.json({ prescription: updated })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/prescriptions/:id/cancel — отменить рецепт ────────────────────

router.post('/:id/cancel', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body

    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id },
    })

    if (!prescription) throw new AppError(404, 'Prescription not found')
    if (prescription.doctorId !== req.user!.userId) throw new AppError(403, 'Access denied')
    if (['dispensed', 'cancelled', 'expired'].includes(prescription.status)) {
      throw new AppError(400, 'Cannot cancel this prescription')
    }

    const cancelReason = prescription.status === 'partially_dispensed'
      ? `Remaining cancelled: ${reason || 'No reason provided'}`
      : reason || 'Cancelled by doctor'

    const updated = await prisma.prescription.update({
      where: { id: req.params.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason,
      },
      include: { patient: true, medications: true },
    })

    await logAction(req.user!.userId, 'CANCEL_PRESCRIPTION', 'Prescription', prescription.id,
      cancelReason, prescription.id)

    res.json({ prescription: updated })
  } catch (err) {
    next(err)
  }
})

export default router
