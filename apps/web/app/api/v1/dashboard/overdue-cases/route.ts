import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { ok, errorResponse } from '@/lib/api/response'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { getDashboardOverdueCases } from '@/lib/dashboard/metrics'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const items = await getDashboardOverdueCases(req.session, scopedBranchId)
    return ok({ items })
  } catch (err) {
    return errorResponse(err)
  }
})
