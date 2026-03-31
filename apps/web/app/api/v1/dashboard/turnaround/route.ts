import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { ok, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { getDashboardTurnaroundStats } from '@/lib/dashboard/metrics'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner'])
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const stats = await getDashboardTurnaroundStats(req.session, scopedBranchId)
    return ok(stats)
  } catch (err) {
    return errorResponse(err)
  }
})
