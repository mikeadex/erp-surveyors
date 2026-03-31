import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { createInvoiceAuditEntry } from '@/lib/invoices/invoice-workflow'

export const POST = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner'])
    const { id } = await ctx.params as { id: string }
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const invoice = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      include: { case: { select: { id: true, stage: true } } },
    })
    if (!invoice) throw Errors.NOT_FOUND('Invoice')
    if (!['draft', 'sent'].includes(invoice.status))
      throw Errors.CONFLICT('Only draft or sent invoices can be voided')

    const updated = await req.db.invoice.updateMany({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      data: { status: 'void' },
    })
    if (updated.count === 0) throw Errors.NOT_FOUND('Invoice')

    if (invoice.status === 'sent' && invoice.case.stage === 'invoice_sent') {
      await req.db.case.updateMany({
        where: { id: invoice.case.id },
        data: { stage: 'final_issued' },
      })
    }

    await createInvoiceAuditEntry(req, {
      action: 'INVOICE_VOIDED',
      entityId: invoice.id,
      before: {
        status: invoice.status,
        caseStage: invoice.case.stage,
      },
      after: {
        status: 'void',
        caseStage: invoice.status === 'sent' && invoice.case.stage === 'invoice_sent'
          ? 'final_issued'
          : invoice.case.stage,
      },
    })

    return ok({ message: 'Invoice voided', status: 'void' })
  } catch (err) {
    return errorResponse(err)
  }
}))
