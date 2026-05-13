import { prisma } from '../prisma/client'

// Вычислить возраст из ИИН (первые 6 цифр = YYMMDD)
export function calcAgeFromIIN(iin: string): number | null {
  if (!iin || iin.length < 7) return null
  const yy = parseInt(iin.substring(0, 2))
  const mm = parseInt(iin.substring(2, 4))
  const dd = parseInt(iin.substring(4, 6))
  const century = parseInt(iin[6]) <= 2 ? 1900 : 2000
  const birthYear = century + yy
  const birth = new Date(birthYear, mm - 1, dd)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--
  return age
}

// Определить пол из ИИН (7-й символ: нечётный = М, чётный = Ж)
export function getGenderFromIIN(iin: string): string | null {
  if (!iin || iin.length < 7) return null
  return parseInt(iin[6]) % 2 === 1 ? 'М' : 'Ж'
}

// Определить категорию пациента по возрасту
export function calcPatientCategory(age: number): 'child' | 'adult' | 'elderly' {
  if (age < 18) return 'child'
  if (age >= 60) return 'elderly'
  return 'adult'
}

// Вычислить дату рождения из ИИН
export function getBirthDateFromIIN(iin: string): Date | null {
  if (!iin || iin.length < 7) return null
  const yy = parseInt(iin.substring(0, 2))
  const mm = parseInt(iin.substring(2, 4))
  const dd = parseInt(iin.substring(4, 6))
  const century = parseInt(iin[6]) <= 2 ? 1900 : 2000
  return new Date(century + yy, mm - 1, dd)
}

// Поиск препаратов по МНН или торговому названию
export async function searchDrugs(query: string, category?: string) {
  const q = query.trim()
  if (!q) return []

  return prisma.drug.findMany({
    where: {
      AND: [
        category ? { category } : {},
        {
          OR: [
            { mnn: { contains: q, mode: 'insensitive' } },
            { tradeName: { contains: q, mode: 'insensitive' } },
            { atxCode: { contains: q, mode: 'insensitive' } },
          ],
        },
      ],
    },
    take: 20,
    orderBy: { mnn: 'asc' },
  })
}

// Получить препараты по диагнозу МКБ-10
export async function getDrugsByDiagnosis(diagnosisCode: string, patientAge?: number) {
  const links = await prisma.diagnosisDrugLink.findMany({
    where: { diagnosisCode: { startsWith: diagnosisCode } },
    include: { drug: true },
  })

  let drugs = links.map(l => l.drug)

  // Фильтр по возрасту если указан
  if (patientAge !== undefined) {
    drugs = drugs.filter(d => {
      if (d.minAge && patientAge < d.minAge) return false
      if (d.maxAge && patientAge > d.maxAge) return false
      return true
    })
  }

  // Убрать дубликаты
  const seen = new Set<string>()
  return drugs.filter(d => {
    if (seen.has(d.id)) return false
    seen.add(d.id)
    return true
  })
}

// Получить препарат по ID
export async function getDrugById(id: string) {
  return prisma.drug.findUnique({ where: { id } })
}

// Проверить взаимодействия между препаратами
export async function checkInteractions(drugIds: string[]) {
  if (drugIds.length < 2) return []

  const interactions = await prisma.drugInteraction.findMany({
    where: {
      OR: [
        { drugAId: { in: drugIds }, drugBId: { in: drugIds } },
      ],
    },
    include: {
      drugA: { select: { mnn: true } },
      drugB: { select: { mnn: true } },
    },
  })

  return interactions
}

// Проверить взаимодействия с активными рецептами пациента
export async function checkInteractionsWithActivePrescriptions(
  patientId: string,
  newDrugIds: string[]
) {
  if (newDrugIds.length === 0) return []

  // Найти активные рецепты пациента
  const activePrescriptions = await prisma.prescription.findMany({
    where: {
      patientId,
      status: { in: ['active', 'partially_dispensed'] },
    },
    include: {
      medications: { where: { drugId: { not: null } } },
    },
  })

  const existingDrugIds = activePrescriptions
    .flatMap(p => p.medications.map(m => m.drugId))
    .filter((id): id is string => id !== null)

  if (existingDrugIds.length === 0) return []

  // Проверить взаимодействия
  const allDrugIds = [...existingDrugIds, ...newDrugIds]
  return checkInteractions(allDrugIds)
}
