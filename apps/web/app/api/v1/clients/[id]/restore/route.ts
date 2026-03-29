import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { assertRecordBranchAccess } from '@/lib/auth/branch-scope'

export const POST = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params as { id: string }

    const existing = await req.db.client.findUnique({ where: { id } })
    if (!existing) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, existing.branchId, 'client')
    if (!existing.deletedAt) {
      throw Errors.BAD_REQUEST('Client is already active')
    }

    await req.db.client.updateMany({
      where: { id },
      data: { deletedAt: null },
    })

    return ok({ message: 'Client restored' })
  } catch (err) {
    return errorResponse(err)
  }
}))
