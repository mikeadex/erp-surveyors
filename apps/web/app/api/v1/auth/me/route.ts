import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import type { AuthedRequest } from '@/lib/api/with-auth'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.session.userId, firmId: req.session.firmId },
      select: {
        id: true,
        firmId: true,
        branchId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        expoPushToken: true,
        createdAt: true,
        updatedAt: true,
        firm: {
          select: { id: true, name: true, slug: true, logoKey: true },
        },
      },
    })

    if (!user) throw Errors.NOT_FOUND('User')
    return ok(user)
  } catch (err) {
    return errorResponse(err)
  }
})
