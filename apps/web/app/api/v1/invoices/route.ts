import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'
import { z } from 'zod'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { assertCaseAndClientBelongToFirm } from '@/lib/db/ownership'
import { requireRole } from '@/lib/auth/guards'
import {
  assertInvoiceCaseOwnership,
  assertNoExistingInvoice,
  calculateInvoiceTotals,
  createInvoiceAuditEntry,
  generateInvoiceNumber,
} from '@/lib/invoices/invoice-workflow'

const CreateInvoiceSchema = z.object({
  caseId: z.string().uuid(),
  clientId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('NGN'),
  taxRate: z.number().min(0).max(1).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'finance'])
    const { skip, take, page, pageSize } = parsePagination(req)
    const params = req.nextUrl.searchParams
    const scopedBranchId = await resolveScopedBranchId(req.session, params.get('branchId'))
    const status = params.get('status')

    const where = {
      ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(status ? { status: status as any } : {}),
    }

    const [items, total] = await Promise.all([
      req.db.invoice.findMany({
        where,
        select: {
          id: true, invoiceNumber: true, status: true,
          amount: true, totalAmount: true, currency: true,
          dueDate: true, paidAt: true, createdAt: true,
          case: { select: { id: true, reference: true } },
          client: { select: { id: true, name: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.invoice.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin', 'finance'])
    const body = CreateInvoiceSchema.parse(await req.json())
    await assertCaseAndClientBelongToFirm(body.caseId, body.clientId, req.firmId)
    const [scopedBranchId, caseRecord] = await Promise.all([
      resolveScopedBranchId(req.session),
      assertInvoiceCaseOwnership(body.caseId, body.clientId, req.firmId),
    ])
    if (scopedBranchId) {
      if (caseRecord.branchId !== scopedBranchId) {
        throw Errors.FORBIDDEN('You can only create invoices for cases in your assigned branch')
      }
    }

    await assertNoExistingInvoice(body.caseId, req.firmId)
    const { taxAmount, totalAmount } = calculateInvoiceTotals(body.amount, body.taxRate)

    let invoice = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const invoiceNumber = await generateInvoiceNumber(req.firmId)
        invoice = await req.db.invoice.create({
          data: {
            caseId: body.caseId,
            clientId: body.clientId,
            invoiceNumber,
            amount: body.amount,
            currency: body.currency,
            ...(body.taxRate !== undefined ? { taxRate: body.taxRate } : {}),
            taxAmount,
            totalAmount,
            ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
            ...(body.notes !== undefined ? { notes: body.notes } : {}),
            createdById: req.session.userId,
          },
          select: {
            id: true, invoiceNumber: true, status: true,
            totalAmount: true, createdAt: true,
            caseId: true,
            clientId: true,
            amount: true,
            currency: true,
            dueDate: true,
          },
        })
        break
      } catch (error: any) {
        if (error?.code !== 'P2002' || attempt === 2) {
          throw error
        }
      }
    }

    if (!invoice) {
      throw Errors.INTERNAL()
    }

    await createInvoiceAuditEntry(req, {
      action: 'INVOICE_CREATED',
      entityId: invoice.id,
      after: {
        status: invoice.status,
        caseId: invoice.caseId,
        clientId: invoice.clientId,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount.toString(),
      },
    })

    return created(invoice)
  } catch (err) {
    return errorResponse(err)
  }
}))
