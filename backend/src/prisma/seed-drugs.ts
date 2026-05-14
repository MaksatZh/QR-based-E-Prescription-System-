import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdmZip = require('adm-zip')

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getRoute(form: string): string {
    const f = form.toLowerCase()
    if (f.includes('подъязычн') || f.includes('сублингвальн')) return 'Сублингвально (под язык)'
    if (f.includes('ингаляц') || f.includes('аэрозоль') || f.includes('спрей для ингал')) return 'Ингаляционно'
    if (f.includes('инъекц') || f.includes('инфузи') || f.includes('лиофилизат') || f.includes('концентрат для')) return 'Инъекционно'
    if (f.includes('глазн') || f.includes('ушн') || f.includes('назальн')) return 'Местно'
    if (f.includes('наружн') || f.includes('накожн')) return 'Наружно'
    if (f.includes('спрей') && !f.includes('ингал') && !f.includes('назальн') && !f.includes('подъязычн')) return 'Наружно'
    if (f.includes('мазь') || f.includes('крем') || f.includes('гель') || f.includes('пластырь')) return 'Наружно'
    if (f.includes('суппозитори') || f.includes('ректальн')) return 'Ректально'
    return 'Внутрь'
}

function getCategory(atx: string): string | null {
    if (atx.startsWith('C02') || atx.startsWith('C03') || atx.startsWith('C07') ||
        atx.startsWith('C08') || atx.startsWith('C09')) return 'Антигипертензивное'
    if (atx.startsWith('J01')) return 'Антибиотик'
    if (atx.startsWith('A')) return 'Противоинфекционное'
    if (atx.startsWith('B')) return 'Противоопухолевое/иммунное'
    if (atx.startsWith('C')) return 'Сердечно-сосудистое'
    if (atx.startsWith('D')) return 'Дерматологическое'
    if (atx.startsWith('G')) return 'Нервная система'
    if (atx.startsWith('H')) return 'Органы чувств'
    if (atx.startsWith('J')) return 'Органы дыхания'
    if (atx.startsWith('L')) return 'Иммунодепрессанты'
    if (atx.startsWith('M')) return 'Опорно-двигательный аппарат'
    if (atx.startsWith('N')) return 'Нервная система'
    if (atx.startsWith('P')) return 'Противопаразитарное'
    if (atx.startsWith('R')) return 'Дыхательная система'
    if (atx.startsWith('S')) return 'Органы чувств'
    return null
}

function parseXlsxDirect(filePath: string): string[][] {
    const zip = new AdmZip(filePath)
    const sheetEntry = zip.getEntry('xl/worksheets/sheet1.xml')
    if (!sheetEntry) throw new Error('sheet1.xml not found')
    const xml = sheetEntry.getData().toString('utf8')
    const rowMatches = xml.match(/<x:row[^>]*>.*?<\/x:row>/gs) || []
    return rowMatches.map(rowXml =>
        (rowXml.match(/<x:v>([^<]*)<\/x:v>/g) || [])
            .map(v => v.replace(/<x:v>|<\/x:v>/g, '').trim())
    )
}

// ─── STEP 1: IMPORT ALL DRUGS ─────────────────────────────────────────────────

async function importDrugs(filePath: string) {
    console.log(`\n📦 Step 1: Importing drugs from ${path.basename(filePath)}`)
    const rows = parseXlsxDirect(filePath)
    console.log(`   Total rows: ${rows.length}`)

    const drugsMap = new Map<string, any>()
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (row.length < 14) continue
        const mnn = (row[11] || '').trim()
        const atx = (row[12] || '').trim()
        const form = (row[13] || '').trim()
        const dose = (row[14] || '').trim()
        const recipe = (row[18] || '').trim()
        const trade = (row[3] || '').trim()
        if (!mnn || !atx) continue

        const key = `${mnn}||${atx}`
        if (!drugsMap.has(key)) {
            drugsMap.set(key, {
                mnn, atxCode: atx, form: form.slice(0, 200),
                routeOfAdmin: getRoute(form),
                dosages: dose ? dose.slice(0, 200) : null,
                isPrescription: recipe === 'Да',
                isLgota: false,
                category: getCategory(atx),
                tradeName: trade || null,
            })
        } else {
            const existing = drugsMap.get(key)!
            if (dose && existing.dosages && !existing.dosages.includes(dose))
                existing.dosages = (existing.dosages + ', ' + dose).slice(0, 200)
            if (!existing.tradeName && trade) existing.tradeName = trade
        }
    }

    const drugs = Array.from(drugsMap.values())
    console.log(`   Unique MNNs: ${drugs.length}`)

    await prisma.drugInteraction.deleteMany()
    await prisma.diagnosisDrugLink.deleteMany()
    await prisma.drug.deleteMany()
    const created = await prisma.drug.createMany({ data: drugs, skipDuplicates: true })
    console.log(`   ✅ Imported ${created.count} drugs`)
    return await prisma.drug.findMany()
}

// ─── STEP 2: IMPORT ICD-10 ───────────────────────────────────────────────────

async function importICD10(filePath: string) {
    console.log(`\n🏥 Step 2: Importing ICD-10 from ${path.basename(filePath)}`)
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').filter(l => l.trim())
    const icd10Data: Array<{ code: string; name: string; groupCode: string }> = []

    for (const line of lines.slice(1)) {
        const parts = line.split(';')
        if (parts.length < 3) continue
        const groupCode = parts[0].trim()
        const name = parts[1].trim()
        const code = parts[2].trim().replace(/\r/g, '')
        if (!code || !name || code.length < 3) continue
        icd10Data.push({ code, name, groupCode })
    }

    await prisma.iCD10.deleteMany()
    const created = await prisma.iCD10.createMany({ data: icd10Data, skipDuplicates: true })
    console.log(`   ✅ Imported ${created.count} ICD-10 codes`)
}

// ─── STEP 3: DIAGNOSIS → DRUG LINKS ──────────────────────────────────────────

async function importDiagnosisLinks(allDrugs: any[]) {
    console.log(`\n🔗 Step 3: Creating diagnosis-drug links`)

    const defaultLinks = [
        { diagnosisCode: 'I10', diagnosisName: 'Эссенциальная (первичная) гипертензия', atxPrefixes: ['C02', 'C03', 'C07', 'C08', 'C09'] },
        { diagnosisCode: 'I11', diagnosisName: 'Гипертензивная болезнь сердца', atxPrefixes: ['C07', 'C08', 'C09'] },
        { diagnosisCode: 'I12', diagnosisName: 'Гипертензивная болезнь с поражением почек', atxPrefixes: ['C09'] },
        { diagnosisCode: 'I13', diagnosisName: 'Гипертензивная болезнь с поражением сердца и почек', atxPrefixes: ['C09'] },
        { diagnosisCode: 'I25', diagnosisName: 'Хроническая ишемическая болезнь сердца', atxPrefixes: ['C07', 'C08'] },
        { diagnosisCode: 'I50', diagnosisName: 'Сердечная недостаточность', atxPrefixes: ['C07', 'C03'] },
        { diagnosisCode: 'I27', diagnosisName: 'Первичная лёгочная гипертензия', atxPrefixes: ['C02K'] },
        { diagnosisCode: 'J06', diagnosisName: 'Острые инфекции верхних дыхательных путей', atxPrefixes: ['J01'] },
        { diagnosisCode: 'J18', diagnosisName: 'Пневмония', atxPrefixes: ['J01'] },
        { diagnosisCode: 'J20', diagnosisName: 'Острый бронхит', atxPrefixes: ['J01'] },
        { diagnosisCode: 'N10', diagnosisName: 'Острый тубулоинтерстициальный нефрит', atxPrefixes: ['J01'] },
        { diagnosisCode: 'N30', diagnosisName: 'Цистит', atxPrefixes: ['J01'] },
        { diagnosisCode: 'A46', diagnosisName: 'Рожа', atxPrefixes: ['J01'] },
    ]

    await prisma.diagnosisDrugLink.deleteMany()

    const linksToCreate: any[] = []

    for (const link of defaultLinks) {
        const matching = allDrugs.filter(d =>
            d.atxCode &&
            link.atxPrefixes.some(p => d.atxCode.startsWith(p))
        )

        for (const drug of matching) {
            linksToCreate.push({
                id: `${link.diagnosisCode}-${drug.id}`,
                diagnosisCode: link.diagnosisCode,
                diagnosisName: link.diagnosisName,
                drugId: drug.id,
            })
        }
    }

    console.log(`   Total links: ${linksToCreate.length}`)

    const chunkSize = 1000

    for (let i = 0; i < linksToCreate.length; i += chunkSize) {
        const chunk = linksToCreate.slice(i, i + chunkSize)

        await prisma.diagnosisDrugLink.createMany({
            data: chunk,
            skipDuplicates: true,
        })

        console.log(`   Inserted ${Math.min(i + chunk.length, linksToCreate.length)} / ${linksToCreate.length}`)
    }

    console.log(`   ✅ Created ${linksToCreate.length} diagnosis-drug links`)
}

// ─── STEP 4: IMPORT DRUG INTERACTIONS ────────────────────────────────────────

async function importInteractions(filePath: string, allDrugs: any[]) {
    console.log(`\n⚠️  Step 4: Importing drug interactions`)

    // Build MNN -> drugId map directly from Russian names
    // Prefer simple drugs over combinations (shorter name = simpler)
    const ruToId = new Map<string, string>()
    const ruToLen = new Map<string, number>()

    for (const drug of allDrugs) {
        const mnn = drug.mnn.trim()
        const key = mnn.toLowerCase()
        const currentLen = ruToLen.get(key) ?? 999
        if (!ruToId.has(key) || mnn.length < currentLen) {
            ruToId.set(key, drug.id)
            ruToLen.set(key, mnn.length)
        }
    }

    console.log(`   Drug map: ${ruToId.size} Russian MNNs indexed`)

    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').slice(1) // skip header

    await prisma.drugInteraction.deleteMany()

    let skipped = 0
    const batch: any[] = []
    const seen = new Set<string>()

    for (const line of lines) {
        if (!line.trim()) continue
        const parts = line.split(',')
        if (parts.length < 3) continue

        const d1 = parts[0].trim().toLowerCase()
        const d2 = parts[1].trim().toLowerCase()
        const description = parts.slice(2).join(',').trim()

        const drugAId = ruToId.get(d1)
        const drugBId = ruToId.get(d2)

        if (!drugAId || !drugBId || drugAId === drugBId) { skipped++; continue }

        const pairKey = [drugAId, drugBId].sort().join('||')
        if (seen.has(pairKey)) continue
        seen.add(pairKey)

        const desc = description.toLowerCase()
        const isSerious =
            desc.includes('противопоказ') ||
            desc.includes('гиперкалиемия') || desc.includes('гиперкалиемию') ||
            desc.includes('кровотечени') || desc.includes('геморраги') ||
            desc.includes('аритми') || desc.includes('брадикарди') ||
            desc.includes('гипотензи') || desc.includes('почечная недостаточ') ||
            desc.includes('гепатотоксич') || desc.includes('нефротоксич') ||
            desc.includes('судорог') || desc.includes('анафилакси') ||
            desc.includes('кардиотоксич') || desc.includes('тяжел') || desc.includes('тяжест') ||
            desc.includes('сердечный блок') || desc.includes('остановка сердца') ||
            desc.includes('угнетение дыхания') || desc.includes('агранулоцитоз')

        const severity = isSerious ? 'contraindicated' : 'warning'
        batch.push({ drugAId, drugBId, severity, description: description.slice(0, 500) })
    }

    console.log(`   Matched pairs: ${batch.length} (skipped ${skipped})`)

    for (let i = 0; i < batch.length; i += 200) {
        await prisma.drugInteraction.createMany({
            data: batch.slice(i, i + 200),
            skipDuplicates: true,
        })
        process.stdout.write(`\r   Importing... ${Math.min(i + 200, batch.length)}/${batch.length}`)
    }

    console.log(`\n   ✅ Imported ${batch.length} interactions`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    const dataDir = path.join(process.cwd(), 'data')
    const registryPath = path.join(dataDir, 'Выгрузка_из_реестр.xlsx')
    const icd10Path = path.join(dataDir, 'mkb10.csv')
    const interactionsPath = path.join(dataDir, 'db_drug_interactions.csv')

    if (!fs.existsSync(registryPath)) throw new Error(`Не найден: ${registryPath}`)
    if (!fs.existsSync(icd10Path)) throw new Error(`Не найден: ${icd10Path}`)
    if (!fs.existsSync(interactionsPath)) throw new Error(`Не найден: ${interactionsPath}`)

    console.log('🚀 Starting full data import...')
    const allDrugs = await importDrugs(registryPath)
    await importICD10(icd10Path)
    await importDiagnosisLinks(allDrugs)
    await importInteractions(interactionsPath, allDrugs)
    console.log('\n🎉 Full import complete!')
    console.log(`   Drugs: ${allDrugs.length}`)
}

main()
    .catch(err => { console.error('❌ Import failed:', err.message); process.exit(1) })
    .finally(() => prisma.$disconnect())