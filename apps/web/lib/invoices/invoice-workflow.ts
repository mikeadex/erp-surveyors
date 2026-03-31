import type { TenantRequest } from '@/lib/api/with-tenant'
import { Errors } from '@/lib/api/errors'
import { prisma } from '@/lib/db/prisma'

export function calculateInvoiceTotals(amount: number, taxRate?: number | null) {
  const safeTaxRate = taxRate ?? 0
  const taxAmount = amount * safeTaxRate
  return {
    taxAmount,
    totalAmount: amount + taxAmount,
  }
}

export async function assertInvoiceCaseOwnership(
  caseId: string,
  clientId: string,
  firmId: string,
) {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, firmId },
    select: {
      id: true,
      clientId: true,
      branchId: true,
    },
  })

  if (!caseRecord) {
    throw Errors.NOT_FOUND('Case')
  }

  if (caseRecord.clientId !== clientId) {
    throw Errors.VALIDATION({
      clientId: ['Invoice client must match the client on the selected case.'],
    })
  }

  return caseRecord
}

export async function assertNoExistingInvoice(caseId: string, firmId: string, invoiceId?: string) {
  const existing = await prisma.invoice.findFirst({
    where: {
      caseId,
      firmId,
      ...(invoiceId ? { id: { not: invoiceId } } : {}),
    },
    select: { id: true, invoiceNumber: true },
  })

  if (existing) {
    throw Errors.CONFLICT(`Case already has invoice ${existing.invoiceNumber}`)
  }
}

export async function generateInvoiceNumber(firmId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `INV-${year}${month}-`

  const latest = await prisma.invoice.findFirst({
    where: {
      firmId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: { invoiceNumber: true },
  })

  const lastSequence = latest?.invoiceNumber.match(/(\d+)$/)?.[1]
  const nextSequence = String((lastSequence ? Number.parseInt(lastSequence, 10) : 0) + 1).padStart(4, '0')
  return `${prefix}${nextSequence}`
}

export async function createInvoiceAuditEntry(
  req: TenantRequest,
  {
    action,
    entityId,
    before,
    after,
  }: {
    action: string
    entityId: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  },
) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) || null

  await req.db.auditLog.create({
    data: {
      userId: req.session.userId,
      action,
      entityType: 'Invoice',
      entityId,
      ...(before !== undefined ? { before: before as any } : {}),
      ...(after !== undefined ? { after: after as any } : {}),
      ipAddress,
      userAgent,
    },
  })
}
