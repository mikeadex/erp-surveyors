import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const updated = await prisma.notification.updateMany({
      where: {
        id,
        userId: req.session.userId,
        firmId: req.session.firmId,
      },
      data: {
        readAt: new Date(),
      },
    })

    if (updated.count === 0) {
      throw Errors.NOT_FOUND('Notification')
    }

    return ok({ id, read: true })
  } catch (err) {
    return errorResponse(err)
  }
})
