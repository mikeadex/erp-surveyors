import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'
import crypto from 'crypto'

const SendCodeSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const { email } = SendCodeSchema.parse(await req.json())
    const normalizedEmail = email.toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingUser) throw Errors.CONFLICT('An account with that email already exists')

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // In development, print to console
    console.log(`\n\n=== VERIFICATION CODE FOR ${normalizedEmail}: ${code} ===\n\n`)

    await prisma.verificationCode.upsert({
      where: { email: normalizedEmail },
      create: {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      },
      update: {
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    })

    return ok({ message: 'Verification code sent' })
  } catch (err) {
    return errorResponse(err)
  }
}
