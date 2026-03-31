import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { createInvoiceAuditEntry } from '@/lib/invoices/invoice-workflow'
import { createNotificationsForRoles } from '@/lib/notifications/workflow'

export const POST = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'finance'])
    const { id } = await ctx.params as { id: string }
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const invoice = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      include: { case: { select: { id: true, stage: true } } },
    })
    if (!invoice) throw Errors.NOT_FOUND('Invoice')
    if (invoice.status !== 'draft') throw Errors.CONFLICT('Only draft invoices can be issued')

    const updated = await req.db.invoice.updateMany({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      data: { status: 'sent' },
    })
    if (updated.count === 0) throw Errors.NOT_FOUND('Invoice')

    if (invoice.case.stage === 'final_issued') {
      await req.db.case.updateMany({
        where: { id: invoice.case.id },
        data: { stage: 'invoice_sent' },
      })
    }

    await createInvoiceAuditEntry(req, {
      action: 'INVOICE_ISSUED',
      entityId: invoice.id,
      before: {
        status: invoice.status,
        caseStage: invoice.case.stage,
      },
      after: {
        status: 'sent',
        caseStage: invoice.case.stage === 'final_issued' ? 'invoice_sent' : invoice.case.stage,
      },
    })

    await createNotificationsForRoles({
      firmId: req.firmId,
      roles: ['managing_partner', 'finance'],
      branchId: scopedBranchId ?? null,
      type: 'invoice_sent',
      title: `Invoice issued for case ${invoice.case.id}`,
      body: 'A case invoice has been issued and is ready for finance follow-up.',
      entityType: 'Case',
      entityId: invoice.case.id,
    })

    return ok({ message: 'Invoice issued', status: 'sent' })
  } catch (err) {
    return errorResponse(err)
  }
}))
