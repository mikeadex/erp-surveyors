import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'
import { hashPassword, getPasswordValidationErrors } from '@/lib/auth/password'
import { NextRequest } from 'next/server'

const ConfirmResetSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = ConfirmResetSchema.parse(await req.json())

    const verificationCode = await prisma.verificationCode.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    })

    if (
      !verificationCode ||
      verificationCode.code !== token ||
      verificationCode.expiresAt < new Date()
    ) {
      throw Errors.VALIDATION({ token: ['Invalid or expired reset token'] })
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      select: { id: true },
    })

    if (!user) throw Errors.VALIDATION({ email: ['No active account was found for this email'] })

    const passwordErrors = getPasswordValidationErrors(newPassword)
    if (passwordErrors.length > 0) {
      throw Errors.VALIDATION({ newPassword: passwordErrors })
    }

    const passwordHash = await hashPassword(newPassword)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          refreshToken: null,
          refreshTokenExpiresAt: null,
        },
      }),
      prisma.verificationCode.delete({
        where: { email: email.toLowerCase() },
      }),
    ])

    return ok({ message: 'Password reset successfully. You may now log in.' })
  } catch (err) {
    return errorResponse(err)
  }
}
