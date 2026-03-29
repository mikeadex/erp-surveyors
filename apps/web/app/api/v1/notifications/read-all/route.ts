import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.session.userId,
        firmId: req.session.firmId,
        readAt: null,
      },
      data: { readAt: new Date() },
    })
    return ok({ message: 'All notifications marked as read' })
  } catch (err) {
    return errorResponse(err)
  }
})
