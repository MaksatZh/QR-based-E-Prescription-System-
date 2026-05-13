import { prisma } from '../prisma/client'

// Удаляет неподтверждённые аккаунты старше 24 часов
export async function cleanupPendingUsers(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Найти пользователей для удаления
  const pendingUsers = await prisma.user.findMany({
    where: {
      accountStatus: 'pending',
      createdAt: { lt: cutoff },
    },
    select: { id: true, email: true, fullName: true },
  })

  if (pendingUsers.length === 0) return 0

  // Удаляем каждого — cascade через Prisma отношения
  for (const user of pendingUsers) {
    try {
      // Удалить audit logs пользователя
      await prisma.auditLog.deleteMany({ where: { userId: user.id } })

      // Удалить пользователя
      await prisma.user.delete({ where: { id: user.id } })

      console.log(`Deleted unconfirmed user: ${user.email} (${user.fullName})`)
    } catch (err) {
      console.error(`Failed to delete user ${user.email}:`, err)
    }
  }

  return pendingUsers.length
}
