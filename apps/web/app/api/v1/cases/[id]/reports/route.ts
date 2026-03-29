import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'

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
        analysis: true,
        inspection: true,
        caseComparables: true,
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

    const report = await prisma.report.create({
      data: {
        caseId: id,
        firmId: req.session.firmId,
        ...(template ? { templateId: template.id } : {}),
        version: versionCount + 1,
        status: 'draft',
        createdById: req.session.userId,
      },
    })

    return ok(report, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
