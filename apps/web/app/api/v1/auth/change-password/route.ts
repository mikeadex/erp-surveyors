import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { getPasswordValidationErrors, verifyPassword, hashPassword } from '@/lib/auth/password'
import { assertActiveSessionUser } from '@/lib/db/ownership'
import { z } from 'zod'

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    const body = ChangePasswordSchema.parse(await req.json())

    const user = await assertActiveSessionUser(req.session.userId, req.session.firmId)

    const valid = await verifyPassword(body.currentPassword, user.passwordHash)
    if (!valid) throw Errors.UNAUTHORIZED()

    const passwordErrors = getPasswordValidationErrors(body.newPassword)
    if (passwordErrors.length > 0) {
      throw Errors.VALIDATION({ newPassword: passwordErrors })
    }

    const newHash = await hashPassword(body.newPassword)
    await prisma.user.updateMany({
      where: { id: user.id, firmId: req.session.firmId },
      data: { passwordHash: newHash, refreshToken: null, refreshTokenExpiresAt: null },
    })

    return ok({ message: 'Password changed successfully' })
  } catch (err) {
    return errorResponse(err)
  }
})
