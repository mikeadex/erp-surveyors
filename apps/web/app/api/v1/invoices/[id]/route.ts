import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { requireRole } from '@/lib/auth/guards'
import { calculateInvoiceTotals, createInvoiceAuditEntry } from '@/lib/invoices/invoice-workflow'

const UpdateInvoiceSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'finance'])
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
    requireRole(req.session.role, ['managing_partner', 'finance'])
    const { id } = await ctx.params
    const body = UpdateInvoiceSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const existing = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        taxRate: true,
        totalAmount: true,
        taxAmount: true,
        dueDate: true,
        notes: true,
      },
    })
    if (!existing) throw Errors.NOT_FOUND('Invoice')
    if (existing.status !== 'draft') {
      throw Errors.CONFLICT('Only draft invoices can be edited directly')
    }

    const nextAmount = body.amount ?? Number(existing.amount)
    const nextTaxRate = body.taxRate === undefined ? (existing.taxRate ? Number(existing.taxRate) : null) : body.taxRate
    const { taxAmount, totalAmount } = calculateInvoiceTotals(nextAmount, nextTaxRate)

    const data: Record<string, unknown> = {
      amount: nextAmount,
      currency: body.currency ?? existing.currency,
      taxRate: nextTaxRate,
      taxAmount,
      totalAmount,
    }

    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate
    }
    if (body.notes !== undefined) {
      data.notes = body.notes
    }

    await req.db.invoice.updateMany({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      data,
    })
    const updated = await req.db.invoice.findUnique({
      where: { id, ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}) },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        amount: true,
        currency: true,
        taxRate: true,
        taxAmount: true,
        totalAmount: true,
        dueDate: true,
        notes: true,
        updatedAt: true,
      },
    })
    if (!updated) throw Errors.NOT_FOUND('Invoice')

    await createInvoiceAuditEntry(req, {
      action: 'INVOICE_UPDATED',
      entityId: updated.id,
      before: {
        amount: existing.amount.toString(),
        currency: existing.currency,
        taxRate: existing.taxRate?.toString() ?? null,
        totalAmount: existing.totalAmount.toString(),
        dueDate: existing.dueDate?.toISOString() ?? null,
        notes: existing.notes ?? null,
      },
      after: {
        amount: updated.amount.toString(),
        currency: updated.currency,
        taxRate: updated.taxRate?.toString() ?? null,
        totalAmount: updated.totalAmount.toString(),
        dueDate: updated.dueDate?.toISOString() ?? null,
        notes: updated.notes ?? null,
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
}))
