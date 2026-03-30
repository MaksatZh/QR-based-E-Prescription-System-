import { prisma } from '../prisma/client'

export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  prescriptionId?: string,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      details,
      prescriptionId,
    },
  })
}
