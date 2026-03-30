import { prisma } from '../prisma/client'
import { PrescriptionStatus } from '@prisma/client'

// Пересчитывает статус рецепта на основе остатков по позициям
export async function recalcPrescriptionStatus(prescriptionId: string): Promise<PrescriptionStatus> {
  const medications = await prisma.prescriptionItem.findMany({
    where: { prescriptionId },
  })

  const totalPrescribed = medications.reduce((sum, m) => sum + m.qtyPrescribed, 0)
  const totalDispensed  = medications.reduce((sum, m) => sum + m.qtyDispensed, 0)
  const hasAnyDispensed = medications.some(m => m.qtyDispensed > 0)
  const allDispensed    = medications.every(m => m.qtyDispensed >= m.qtyPrescribed)

  let status: PrescriptionStatus

  if (allDispensed && totalDispensed >= totalPrescribed) {
    status = 'dispensed'
  } else if (hasAnyDispensed) {
    status = 'partially_dispensed'
  } else {
    status = 'active'
  }

  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: { status },
  })

  return status
}

// Помечает истёкшие рецепты (вызывается cron-джобом)
export async function expirePrescriptions(): Promise<number> {
  const result = await prisma.prescription.updateMany({
    where: {
      status: { in: ['active', 'created', 'partially_dispensed'] },
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  })

  return result.count
}
