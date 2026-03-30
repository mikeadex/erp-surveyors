import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { renderReportDraft } from '@/lib/reports/report-renderer'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const reports = await prisma.report.findMany({
      where: { caseId: id },
      include: {
        template: { select: { id: true, name: true } },
        comments: { select: { id: true, type: true, isResolved: true } },
      },
      orderBy: { version: 'desc' },
    })

    return ok(reports)
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id } = await ctx.params as { id: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      include: {
        firm: {
          select: {
            name: true,
            rcNumber: true,
            esvarNumber: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
          },
        },
        branch: { select: { name: true } },
        client: {
          select: {
            name: true,
            type: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            rcNumber: true,
            contacts: {
              orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
              select: {
                name: true,
                email: true,
                phone: true,
                role: true,
                isPrimary: true,
              },
            },
          },
        },
        property: {
          select: {
            address: true,
            city: true,
            state: true,
            localGovernment: true,
            propertyUse: true,
            tenureType: true,
            plotSize: true,
            plotSizeUnit: true,
            description: true,
          },
        },
        assignedValuer: { select: { firstName: true, lastName: true } },
        assignedReviewer: { select: { firstName: true, lastName: true } },
        analysis: true,
        inspection: {
          include: {
            media: { select: { id: true } },
            inspector: { select: { firstName: true, lastName: true } },
          },
        },
        caseComparables: {
          include: {
            comparable: {
              select: {
                comparableType: true,
                address: true,
                city: true,
                state: true,
                propertyUse: true,
                transactionDate: true,
                salePrice: true,
                rentalValue: true,
                pricePerSqm: true,
                source: true,
                isVerified: true,
              },
            },
          },
        },
        invoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            currency: true,
            status: true,
            dueDate: true,
          },
        },
      },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const errors: string[] = []
    if (!caseRecord.analysis || caseRecord.analysis.status !== 'complete')
      errors.push('Valuation analysis must be completed first')
    if (!caseRecord.inspection || caseRecord.inspection.status !== 'submitted')
      errors.push('Inspection must be submitted first')
    if (caseRecord.caseComparables.length === 0)
      errors.push('At least one comparable must be attached')

    if (errors.length > 0) {
      throw Errors.VALIDATION(
        Object.fromEntries(errors.map((e, i) => [`error_${i}`, [e]])),
      )
    }

    const versionCount = await prisma.report.count({ where: { caseId: id } })

    const template = await prisma.reportTemplate.findFirst({
      where: { firmId: req.session.firmId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    const renderedHtml = renderReportDraft({
      caseRecord,
      version: versionCount + 1,
      templateName: template?.name ?? null,
      templateHtml: template?.templateHtml ?? null,
      templateDefaultDisclaimers: template?.defaultDisclaimers ?? null,
    })

    const report = await prisma.report.create({
      data: {
        caseId: id,
        firmId: req.session.firmId,
        ...(template ? { templateId: template.id } : {}),
        version: versionCount + 1,
        status: 'draft',
        renderedHtml,
        generatedAt: new Date(),
        createdById: req.session.userId,
      },
    })

    return ok(report, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
