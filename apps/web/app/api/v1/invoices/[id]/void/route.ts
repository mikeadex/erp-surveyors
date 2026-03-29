import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const POST = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner'])
    const { id } = await ctx.params as { id: string }
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const invoice = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
    })
    if (!invoice) throw Errors.NOT_FOUND('Invoice')
    if (!['draft', 'sent'].includes(invoice.status))
      throw Errors.CONFLICT('Only draft or sent invoices can be voided')

    const updated = await req.db.invoice.updateMany({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      data: { status: 'void' },
    })
    if (updated.count === 0) throw Errors.NOT_FOUND('Invoice')

    return ok({ message: 'Invoice voided' })
  } catch (err) {
    return errorResponse(err)
  }
}))
