import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { PushTokenSchema } from '@valuation-os/utils'
import { Errors } from '@/lib/api/errors'
import { assertRateLimit, buildRateLimitKey } from '@/lib/api/rate-limit'

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    assertRateLimit(req, {
      namespace: 'push-token-register',
      limit: 20,
      windowMs: 60 * 60 * 1000,
      key: buildRateLimitKey(req, [req.session.firmId, req.session.userId]),
    })

    const { token } = PushTokenSchema.parse(await req.json())

    const result = await prisma.user.updateMany({
      where: { id: req.session.userId, firmId: req.session.firmId },
      data: { expoPushToken: token },
    })
    if (result.count === 0) throw Errors.UNAUTHORIZED()

    return ok({ message: 'Push token registered' })
  } catch (err) {
    return errorResponse(err)
  }
})
