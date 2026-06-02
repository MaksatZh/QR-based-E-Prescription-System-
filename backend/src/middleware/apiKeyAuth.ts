import { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma/client'

export interface ApiRequest extends Request {
  organization?: any
  apiKey?: any
}

export async function authenticateApiKey(
  req: ApiRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        hint: 'Add X-API-Key header to your request',
      })
    }

    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { organization: true },
    })

    if (!key) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    if (!key.isActive) {
      return res.status(401).json({ error: 'API key has been revoked' })
    }

    if (key.organization.status !== 'active') {
      return res.status(403).json({
        error: 'Organization is not active',
        status: key.organization.status,
      })
    }

    // Обновляем статистику использования
    await prisma.apiKey.update({
      where: { id: key.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    })

    req.organization = key.organization
    req.apiKey = key
    next()
  } catch (err) {
    next(err)
  }
}
