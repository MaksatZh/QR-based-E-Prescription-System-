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
  form: z.string().default('other'),
  dosage: z.string().min(1),
  qtyPrescribed: z.number().int().positive(),
  course: z.string().default(''),
  drugId: z.string().optional(),
  atxCode: z.string().optional(),
  routeOfAdmin: z.string().optional(),
  startDate: z.string().optional(),
  durationDays: z.number().int().optional(),
  frequency: z.string().optional(),
  instructions: z.string().optional(),
})

const createPrescriptionSchema = z.object({
  patient: z.object({
    fullName: z.string().min(1),
    iin: z.string().length(12),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
  medications: z.array(medicationSchema).min(1),
  diagnosisCode: z.string().optional(),
  diagnosisName: z.string().optional(),
  patientWeight: z.number().optional(),
  patientAge: z.number().int().optional(),
  patientCategory: z.enum(['child', 'adult', 'elderly']).optional(),
  notes: z.string().optional(),
})

const editPrescriptionSchema = z.object({
  diagnosisCode: z.string().optional(),
  diagnosisName: z.string().optional(),
  medications: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1).optional(),
    form: z.string().optional(),
    dosage: z.string().min(1).optional(),
    qtyPrescribed: z.number().int().positive().optional(),
    course: z.string().optional(),
    drugId: z.string().optional(),
    atxCode: z.string().optional(),
    routeOfAdmin: z.string().optional(),
    startDate: z.string().optional(),
    durationDays: z.number().int().optional(),
    frequency: z.string().optional(),
    instructions: z.string().optional(),
  })).optional(),
})

// ─── GET /api/prescriptions ───────────────────────────────────────────────────

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
      include: { patient: true, medications: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ prescriptions })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/prescriptions/:id ──────────────────────────────────────────────

router.get('/:id', authenticate, authorize('doctor', 'pharmacist'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id as string },
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
    if (req.user!.role === 'doctor' && prescription.doctorId !== req.user!.userId) {
      throw new AppError(403, 'Access denied')
    }
    res.json({ prescription })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/prescriptions ─────────────────────────────────────────────────

router.post('/', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patient, medications, diagnosisCode, diagnosisName, patientWeight, patientAge, patientCategory, notes } = createPrescriptionSchema.parse(req.body)

    const validityDays = parseInt(process.env.PRESCRIPTION_VALIDITY_DAYS || '30')
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)

    let patientRecord = await prisma.patient.findFirst({ where: { iin: patient.iin } })
    if (!patientRecord) {
      patientRecord = await prisma.patient.create({
        data: {
          fullName: patient.fullName!,
          iin: patient.iin!,
          phone: patient.phone!,
          email: patient.email!,
        }
      })
    } else {
      patientRecord = await prisma.patient.update({
        where: { id: patientRecord.id },
        data: { fullName: patient.fullName, phone: patient.phone, email: patient.email },
      })
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId: patientRecord.id,
        doctorId: req.user!.userId,
        status: 'active',
        expiresAt,
        diagnosisCode: diagnosisCode || null,
        diagnosisName: diagnosisName || null,
        patientWeight: patientWeight || null,
        patientAge: patientAge || null,
        patientCategory: patientCategory || null,
        notes: notes || null,
        medications: {
          create: medications.map(m => ({
            name: m.name!,
            form: m.form || 'other',
            dosage: m.dosage!,
            qtyPrescribed: m.qtyPrescribed!,
            course: m.course || m.instructions || '',
            qtyDispensed: 0,
            drugId: m.drugId || null,
            atxCode: m.atxCode || null,
            routeOfAdmin: m.routeOfAdmin || null,
            startDate: m.startDate ? new Date(m.startDate) : null,
            durationDays: m.durationDays || null,
            frequency: m.frequency || null,
            instructions: m.instructions || null,
          })),
        },
      },
      include: { patient: true, medications: true },
    })

    await logAction(req.user!.userId, 'CREATE_PRESCRIPTION', 'Prescription', prescription.id,
        `Created prescription for patient ${patient.fullName} (IIN: ${patient.iin})`, prescription.id)

    try {
      const doctor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { fullName: true } })
      await sendPrescriptionEmail(
          patientRecord.email, patientRecord.fullName, doctor?.fullName || 'Врач', prescription.id,
          prescription.medications.map(m => ({ name: m.name, dosage: m.dosage, qtyPrescribed: m.qtyPrescribed }))
      )
    } catch (emailErr) {
      console.error('Failed to send prescription email:', emailErr)
    }

    res.status(201).json({ prescription })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/prescriptions/:id ────────────────────────────────────────────

router.patch('/:id', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id as string },
      include: { medications: true },
    })
    if (!prescription) throw new AppError(404, 'Prescription not found')
    if (prescription.doctorId !== req.user!.userId) throw new AppError(403, 'Access denied')
    if (['dispensed', 'cancelled', 'expired'].includes(prescription.status)) {
      throw new AppError(400, 'Cannot edit this prescription')
    }

    const { medications, diagnosisCode, diagnosisName } = editPrescriptionSchema.parse(req.body)

    if (diagnosisCode !== undefined || diagnosisName !== undefined) {
      await prisma.prescription.update({
        where: { id: prescription.id },
        data: {
          ...(diagnosisCode !== undefined && { diagnosisCode }),
          ...(diagnosisName !== undefined && { diagnosisName }),
        },
      })
    }

    if (medications) {
      for (const med of medications) {
        if (med.id) {
          const existing = prescription.medications.find(m => m.id === med.id)
          if (!existing) throw new AppError(404, `Medication ${med.id} not found`)

          if (prescription.status === 'partially_dispensed' && existing.qtyDispensed > 0) {
            const nameChanged   = med.name   && med.name   !== existing.name
            const formChanged   = med.form   && med.form   !== existing.form
            const dosageChanged = med.dosage && med.dosage !== existing.dosage
            if (nameChanged || formChanged || dosageChanged) {
              throw new AppError(400, `Cannot change drug/form/dosage for medication "${existing.name}" — already partially dispensed`)
            }
          }

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
              ...(med.drugId !== undefined && { drugId: med.drugId }),
              ...(med.atxCode !== undefined && { atxCode: med.atxCode }),
              ...(med.routeOfAdmin !== undefined && { routeOfAdmin: med.routeOfAdmin }),
              ...(med.startDate !== undefined && { startDate: med.startDate ? new Date(med.startDate) : null }),
              ...(med.durationDays !== undefined && { durationDays: med.durationDays }),
              ...(med.frequency !== undefined && { frequency: med.frequency }),
              ...(med.instructions !== undefined && { instructions: med.instructions }),
            },
          })
        } else {
          await prisma.prescriptionItem.create({
            data: {
              prescriptionId: prescription.id,
              name: med.name!,
              form: med.form || 'other',
              dosage: med.dosage!,
              qtyPrescribed: med.qtyPrescribed!,
              course: med.course || med.instructions || '',
              qtyDispensed: 0,
              drugId: med.drugId || null,
              atxCode: med.atxCode || null,
              routeOfAdmin: med.routeOfAdmin || null,
              startDate: med.startDate ? new Date(med.startDate) : null,
              durationDays: med.durationDays || null,
              frequency: med.frequency || null,
              instructions: med.instructions || null,
            },
          })
        }
      }
    }

    await logAction(req.user!.userId, 'EDIT_PRESCRIPTION', 'Prescription', prescription.id, 'Prescription edited', prescription.id)

    const updated = await prisma.prescription.findUnique({
      where: { id: prescription.id },
      include: { patient: true, medications: true },
    })
    res.json({ prescription: updated })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/prescriptions/:id/cancel ──────────────────────────────────────

router.post('/:id/cancel', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body
    const prescription = await prisma.prescription.findUnique({ where: { id: req.params.id as string } })
    if (!prescription) throw new AppError(404, 'Prescription not found')
    if (prescription.doctorId !== req.user!.userId) throw new AppError(403, 'Access denied')
    if (['dispensed', 'cancelled', 'expired'].includes(prescription.status)) {
      throw new AppError(400, 'Cannot cancel this prescription')
    }

    const cancelReason = prescription.status === 'partially_dispensed'
        ? `Remaining cancelled: ${reason || 'No reason provided'}`
        : reason || 'Cancelled by doctor'

    const updated = await prisma.prescription.update({
      where: { id: req.params.id as string },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason },
      include: { patient: true, medications: true },
    })

    await logAction(req.user!.userId, 'CANCEL_PRESCRIPTION', 'Prescription', prescription.id, cancelReason, prescription.id)
    res.json({ prescription: updated })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/prescriptions/:id/resend-email ────────────────────────────────

router.post('/:id/resend-email', authenticate, authorize('doctor'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: req.params.id as string },
      include: { patient: true, medications: true },
    })
    if (!prescription) throw new AppError(404, 'Prescription not found')
    if (prescription.doctorId !== req.user!.userId) throw new AppError(403, 'Access denied')
    if (['cancelled', 'expired'].includes(prescription.status)) {
      throw new AppError(400, 'Cannot resend email for cancelled or expired prescription')
    }

    const doctor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { fullName: true } })
    await sendPrescriptionEmail(
        prescription.patient.email, prescription.patient.fullName, doctor?.fullName || 'Врач', prescription.id,
        prescription.medications.map(m => ({ name: m.name, dosage: m.dosage, qtyPrescribed: m.qtyPrescribed }))
    )

    await logAction(req.user!.userId, 'RESEND_EMAIL', 'Prescription', prescription.id,
        `Resent QR email to ${prescription.patient.email}`, prescription.id)

    res.json({ success: true, message: `Email sent to ${prescription.patient.email}` })
  } catch (err) {
    next(err)
  }
})

export default router