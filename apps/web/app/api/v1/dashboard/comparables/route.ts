import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { ok, errorResponse } from '@/lib/api/response'
import { getDashboardComparableStats } from '@/lib/dashboard/metrics'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const stats = await getDashboardComparableStats(req.session)
    return ok(stats)
  } catch (err) {
    return errorResponse(err)
  }
})
