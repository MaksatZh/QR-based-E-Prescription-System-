import { PrismaClient, UserRole, AccountStatus, MedicationForm } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    const passwordHash = await bcrypt.hash('password123', 10)

    // ─── Super Admin ───────────────────────────
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@example.kz' },
        update: {},
        create: {
            fullName: 'Askar Nazarbayev',
            email: 'superadmin@example.kz',
            phone: '+77775559999',
            passwordHash,
            role: UserRole.super_admin,
            accountStatus: AccountStatus.active,
        },
    })

    // ─── Admin ─────────────────────────────────
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.kz' },
        update: {},
        create: {
            fullName: 'Aliya Nurzhanova',
            email: 'admin@example.kz',
            phone: '+77775554433',
            passwordHash,
            role: UserRole.admin,
            accountStatus: AccountStatus.active,
            createdById: superAdmin.id,
        },
    })

    // ─── Doctors ───────────────────────────────
    const doctor1 = await prisma.user.upsert({
        where: { email: 'doctor@example.kz' },
        update: {},
        create: {
            fullName: 'Dr. Aigerim Suleimenova',
            email: 'doctor@example.kz',
            phone: '+77771234567',
            passwordHash,
            role: UserRole.doctor,
            accountStatus: AccountStatus.active,
            createdById: admin.id,
        },
    })

    const doctor2 = await prisma.user.upsert({
        where: { email: 'doctor2@example.kz' },
        update: {},
        create: {
            fullName: 'Dr. Nurlan Ospanov',
            email: 'doctor2@example.kz',
            phone: '+77771234568',
            passwordHash,
            role: UserRole.doctor,
            accountStatus: AccountStatus.active,
            createdById: admin.id,
        },
    })

    // ─── Pharmacists ───────────────────────────
    const pharmacist = await prisma.user.upsert({
        where: { email: 'pharmacist@example.kz' },
        update: {},
        create: {
            fullName: 'Marat Kulanov',
            email: 'pharmacist@example.kz',
            phone: '+77779876543',
            passwordHash,
            role: UserRole.pharmacist,
            accountStatus: AccountStatus.active,
            createdById: admin.id,
        },
    })

    // ─── Patients ──────────────────────────────
    const patient1 = await prisma.patient.upsert({
        where: { id: 'patient-seed-1' },
        update: {},
        create: {
            id: 'patient-seed-1',
            fullName: 'Assel Karimova',
            iin: '920415350167',
            phone: '+77771112233',
            email: 'assel.k@example.kz',
        },
    })

    const patient2 = await prisma.patient.upsert({
        where: { id: 'patient-seed-2' },
        update: {},
        create: {
            id: 'patient-seed-2',
            fullName: 'Daniyar Bekov',
            iin: '850728450289',
            phone: '+77772223344',
            email: 'daniyar.b@example.kz',
        },
    })

    // ─── Prescriptions ─────────────────────────
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Prescription 1 — Active
    const rx1 = await prisma.prescription.upsert({
        where: { id: 'rx-seed-001' },
        update: {},
        create: {
            id: 'rx-seed-001',
            patientId: patient1.id,
            doctorId: doctor1.id,
            status: 'active',
            createdAt: now,
            expiresAt,
            medications: {
                create: [
                    {
                        name: 'Amoxicillin',
                        form: MedicationForm.tablets,
                        dosage: '500mg',
                        qtyPrescribed: 30,
                        qtyDispensed: 0,
                        course: 'Take 1 tablet 3 times daily after meals for 10 days',
                    },
                    {
                        name: 'Ibuprofen',
                        form: MedicationForm.tablets,
                        dosage: '400mg',
                        qtyPrescribed: 20,
                        qtyDispensed: 0,
                        course: 'Take 1 tablet as needed for pain, max 3 times daily',
                    },
                ],
            },
        },
    })

    // Prescription 2 — Partially dispensed
    const rx2 = await prisma.prescription.upsert({
        where: { id: 'rx-seed-002' },
        update: {},
        create: {
            id: 'rx-seed-002',
            patientId: patient2.id,
            doctorId: doctor1.id,
            status: 'partially_dispensed',
            createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            expiresAt,
            medications: {
                create: [
                    {
                        name: 'Lisinopril',
                        form: MedicationForm.tablets,
                        dosage: '10mg',
                        qtyPrescribed: 30,
                        qtyDispensed: 15,
                        course: 'Take 1 tablet once daily in the morning',
                    },
                    {
                        name: 'Atorvastatin',
                        form: MedicationForm.tablets,
                        dosage: '20mg',
                        qtyPrescribed: 30,
                        qtyDispensed: 15,
                        course: 'Take 1 tablet once daily in the evening',
                    },
                ],
            },
        },
    })

    console.log('✅ Seed complete!')
    console.log('')
    console.log('📋 Demo accounts (password: password123):')
    console.log(`  Super Admin : superadmin@example.kz`)
    console.log(`  Admin       : admin@example.kz`)
    console.log(`  Doctor      : doctor@example.kz`)
    console.log(`  Doctor 2    : doctor2@example.kz`)
    console.log(`  Pharmacist  : pharmacist@example.kz`)
    console.log('')
    console.log('💊 Sample prescriptions:')
    console.log(`  Active          : ${rx1.id}`)
    console.log(`  Partially disp. : ${rx2.id}`)
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })