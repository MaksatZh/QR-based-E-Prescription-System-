import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  searchDrugs,
  getDrugsByDiagnosis,
  getDrugById,
  checkInteractions,
  checkInteractionsWithActivePrescriptions,
  calcAgeFromIIN,
  getGenderFromIIN,
  getBirthDateFromIIN,
  calcPatientCategory,
} from '../services/drug.service'
import { prisma } from '../prisma/client'

const router = Router()

// GET /api/drugs/search?q=кандесартан&category=Антигипертензивное
router.get('/search', authenticate, authorize('doctor', 'pharmacist'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string || ''
    const category = req.query.category as string | undefined
    const drugs = await searchDrugs(q, category)
    res.json({ drugs })
  } catch (err) {
    next(err)
  }
})


// GET /api/drugs/icd10/search?q=гипертония
router.get('/icd10/search', authenticate, authorize('doctor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim()
    if (!q || q.length < 2) return res.json({ codes: [] })

    const codes = await prisma.iCD10.findMany({
      where: {
        OR: [
          { code: { startsWith: q.toUpperCase() } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      orderBy: { code: 'asc' },
    })
    res.json({ codes })
  } catch (err) {
    next(err)
  }
})

// GET /api/drugs/by-diagnosis?code=I10&age=45
router.get('/by-diagnosis', authenticate, authorize('doctor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string
    const age = req.query.age ? parseInt(req.query.age as string) : undefined
    if (!code) return res.json({ drugs: [] })
    const drugs = await getDrugsByDiagnosis(code, age)
    res.json({ drugs })
  } catch (err) {
    next(err)
  }
})

// GET /api/drugs/patient-info?iin=123456789012
// Возвращает возраст, пол, категорию и данные пациента если есть в БД
router.get('/patient-info', authenticate, authorize('doctor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const iin = req.query.iin as string
    if (!iin || iin.length !== 12) {
      return res.json({ patient: null, age: null, gender: null, category: null })
    }

    const age = calcAgeFromIIN(iin)
    const gender = getGenderFromIIN(iin)
    const birthDate = getBirthDateFromIIN(iin)
    const category = age !== null ? calcPatientCategory(age) : null

    // Найти пациента в базе
    const patient = await prisma.patient.findFirst({ where: { iin } })

    res.json({ patient, age, gender, birthDate, category })
  } catch (err) {
    next(err)
  }
})

// POST /api/drugs/check-interactions
// Body: { drugIds: string[] }
router.post('/check-interactions', authenticate, authorize('doctor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { drugIds } = req.body
    if (!Array.isArray(drugIds)) return res.json({ interactions: [] })
    const interactions = await checkInteractions(drugIds)
    res.json({ interactions })
  } catch (err) {
    next(err)
  }
})

// POST /api/drugs/check-patient-interactions
// Body: { patientId: string, drugIds: string[] }
router.post('/check-patient-interactions', authenticate, authorize('doctor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, drugIds } = req.body
    if (!patientId || !Array.isArray(drugIds)) return res.json({ interactions: [] })
    const interactions = await checkInteractionsWithActivePrescriptions(patientId, drugIds)
    res.json({ interactions })
  } catch (err) {
    next(err)
  }
})

// GET /api/drugs/:id
router.get('/:id', authenticate, authorize('doctor', 'pharmacist'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drug = await getDrugById(req.params.id as string)
    if (!drug) return res.status(404).json({ error: 'Drug not found' })
    res.json({ drug })
  } catch (err) {
    next(err)
  }
})

export default router
