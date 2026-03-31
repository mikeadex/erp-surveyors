import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { ok, errorResponse } from '@/lib/api/response'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { getDashboardStageItems } from '@/lib/dashboard/metrics'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )
    const rows = await getDashboardStageItems(req.session, scopedBranchId)

    return ok({
      items: rows,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
