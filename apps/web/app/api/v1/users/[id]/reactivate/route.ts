import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const POST = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params as { id: string }
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const user = await req.db.user.findUnique({
      where: { id, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      select: { id: true, role: true, isActive: true },
    })
    if (!user) throw Errors.NOT_FOUND('User')
    if (user.isActive) throw Errors.CONFLICT('User is already active')

    await req.db.user.updateMany({
      where: { id, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      data: { isActive: true },
    })

    return ok({ message: 'User reactivated' })
  } catch (err) {
    return errorResponse(err)
  }
}))
