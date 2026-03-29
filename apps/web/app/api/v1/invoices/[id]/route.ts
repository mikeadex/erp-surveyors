import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'partial', 'overdue', 'void']),
  paidAt: z.coerce.date().optional(),
})

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const invoice = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      include: {
        case: { select: { id: true, reference: true, stage: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    if (!invoice) throw Errors.NOT_FOUND('Invoice')
    return ok(invoice)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params
    const body = UpdateInvoiceStatusSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const existing = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
    })
    if (!existing) throw Errors.NOT_FOUND('Invoice')

    await req.db.invoice.updateMany({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      data: {
        status: body.status,
        ...(body.status === 'paid' ? { paidAt: body.paidAt ?? new Date() } : {}),
      },
    })
    const updated = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      select: { id: true, invoiceNumber: true, status: true, paidAt: true, updatedAt: true },
    })
    if (!updated) throw Errors.NOT_FOUND('Invoice')
    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
}))
