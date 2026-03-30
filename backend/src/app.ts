import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { prisma } from './prisma/client'
import { errorHandler } from './middleware/errorHandler'
import { expirePrescriptions } from './services/prescription.service'

import authRoutes         from './routes/auth.routes'
import prescriptionRoutes from './routes/prescription.routes'
import dispenseRoutes     from './routes/dispense.routes'
import adminRoutes        from './routes/admin.routes'
import publicRoutes       from './routes/public.routes'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth',          authRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/dispense',      dispenseRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/public',        publicRoutes)

app.use(errorHandler)

cron.schedule('0 */6 * * *', async () => {
    const count = await expirePrescriptions()
    if (count > 0) console.log(`⏰ Expired ${count} prescription(s)`)
})

async function bootstrap() {
    try {
        await prisma.$connect()
        console.log('Database connected')
        app.listen(PORT, () => console.log(` Server running on http://localhost:${PORT}`))
    } catch (error) {
        console.error(' Failed to start:', error)
        process.exit(1)
    }
}

bootstrap()