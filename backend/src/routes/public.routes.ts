import { Router, Request, Response, NextFunction } from 'express'
import QRCode from 'qrcode'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// GET /api/public/prescription/:id — публичная страница пациента (без авторизации)
router.get('/prescription/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        patient: { select: { fullName: true } },
        medications: {
          select: {
            id: true,
            name: true,
            form: true,
            dosage: true,
            qtyPrescribed: true,
            qtyDispensed: true,
            course: true,
          },
        },
        doctor: { select: { fullName: true } },
      },
    })

    if (!prescription) throw new AppError(404, 'Prescription not found')

    // Формируем данные с остатками
    const medications = prescription.medications.map(m => ({
      ...m,
      qtyRemaining: m.qtyPrescribed - m.qtyDispensed,
    }))

    res.json({
      id: prescription.id,
      status: prescription.status,
      createdAt: prescription.createdAt,
      expiresAt: prescription.expiresAt,
      doctorName: prescription.doctor.fullName,
      patient: prescription.patient,
      medications,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/public/qr/:id — генерирует QR-код как base64 PNG
router.get('/qr/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const prescription = await prisma.prescription.findUnique({ where: { id } })
    if (!prescription) throw new AppError(404, 'Prescription not found')

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const patientUrl = `${frontendUrl}/patient/${id}`

    const qrDataUrl = await QRCode.toDataURL(patientUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })

    res.json({ qrDataUrl, patientUrl })
  } catch (err) {
    next(err)
  }
})

export default router
