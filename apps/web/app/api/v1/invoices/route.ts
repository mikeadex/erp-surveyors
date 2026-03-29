import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'
import { z } from 'zod'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { assertCaseAndClientBelongToFirm } from '@/lib/db/ownership'

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
    const body = CreateInvoiceSchema.parse(await req.json())
    await assertCaseAndClientBelongToFirm(body.caseId, body.clientId, req.firmId)
    const scopedBranchId = await resolveScopedBranchId(req.session)
    if (scopedBranchId) {
      const branchCase = await req.db.case.findUnique({
        where: { id: body.caseId, branchId: scopedBranchId },
        select: { id: true },
      })
      if (!branchCase) {
        throw Errors.FORBIDDEN('You can only create invoices for cases in your assigned branch')
      }
    }

    const taxAmount = body.taxRate ? body.amount * body.taxRate : 0
    const totalAmount = body.amount + taxAmount

    const lastInvoice = await req.db.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    })
    const nextNum = lastInvoice
      ? String(parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ''), 10) + 1).padStart(4, '0')
      : '0001'
    const invoiceNumber = `INV-${nextNum}`

    const invoice = await req.db.invoice.create({
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
      },
    })
    return created(invoice)
  } catch (err) {
    return errorResponse(err)
  }
}))
