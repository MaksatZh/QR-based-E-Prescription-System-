import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAction } from '../services/audit.service'
import { recalcPrescriptionStatus } from '../services/prescription.service'

const router = Router()

const dispenseSchema = z.object({
  items: z.array(z.object({
    medicationId: z.string(),
    qtyDispensed: z.number().int().positive(),
  })).min(1),
  note: z.string().optional(),
})

// POST /api/dispense/:prescriptionId
router.post('/:prescriptionId', authenticate, authorize('pharmacist'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescriptionId = req.params.prescriptionId as string
    const { items, note } = dispenseSchema.parse(req.body)

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { medications: true },
    }) as any

    if (!prescription) throw new AppError(404, 'Prescription not found')

    if (prescription.status === 'dispensed') {
      throw new AppError(400, 'Prescription already fully dispensed')
    }
    if (prescription.status === 'cancelled') {
      throw new AppError(400, 'Prescription is cancelled')
    }
    if (prescription.status === 'expired') {
      throw new AppError(400, 'Prescription has expired')
    }

    // Проверяем что не выдаём больше чем осталось
    for (const item of items) {
      const med = prescription.medications.find(m => m.id === item.medicationId)
      if (!med) throw new AppError(404, `Medication ${item.medicationId} not found`)

      const remaining = med.qtyPrescribed - med.qtyDispensed
      if (item.qtyDispensed > remaining) {
        throw new AppError(400, `Cannot dispense ${item.qtyDispensed} of "${med.name}" — only ${remaining} remaining`)
      }
    }

    // Создаём dispense event
    const dispenseEvent = await prisma.dispenseEvent.create({
      data: {
        prescriptionId,
        pharmacistId: req.user!.userId,
        note,
        items: {
          create: items.map(item => ({
            itemId: item.medicationId,
            qtyDispensed: item.qtyDispensed,
          })),
        },
      },
      include: { items: true },
    })

    // Обновляем qtyDispensed по каждой позиции
    for (const item of items) {
      await prisma.prescriptionItem.update({
        where: { id: item.medicationId },
        data: { qtyDispensed: { increment: item.qtyDispensed } },
      })
    }

    // Пересчитываем статус рецепта
    const newStatus = await recalcPrescriptionStatus(prescriptionId)

    await logAction(
      req.user!.userId,
      'DISPENSE',
      'Prescription',
      prescriptionId,
      `Dispensed ${items.length} medication(s). New status: ${newStatus}`,
      prescriptionId,
    )

    const updatedPrescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { patient: true, medications: true },
    }) as any

    res.json({ dispenseEvent, prescription: updatedPrescription })
  } catch (err) {
    next(err)
  }
})

// GET /api/dispense/history — история выдач фармацевта
router.get('/history', authenticate, authorize('pharmacist'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const events = await prisma.dispenseEvent.findMany({
      where: { pharmacistId: req.user!.userId },
      include: {
        prescription: { include: { patient: true } },
        items: { include: { item: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    })

    res.json({ events })
  } catch (err) {
    next(err)
  }
})

export default router
