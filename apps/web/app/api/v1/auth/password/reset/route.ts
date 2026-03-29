import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { z } from 'zod'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

const ResetRequestSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const { email } = ResetRequestSchema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, isActive: true, firmId: true },
    })

    if (!user || !user.isActive) {
      return ok({ message: 'If that email is registered, a reset link has been sent.' })
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    console.log(`\n\n=== PASSWORD RESET CODE FOR ${email.toLowerCase()}: ${token} ===\n\n`)

    await prisma.verificationCode.upsert({
      where: { email: email.toLowerCase() },
      create: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        code: token,
        expiresAt,
      },
      update: {
        code: token,
        expiresAt,
      },
    })

    return ok({
      message: 'If that email is registered, a reset code has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { debugToken: token } : {}),
    })
  } catch (err) {
    return errorResponse(err)
  }
}
