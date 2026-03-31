import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { createAuditEntry, fetchReportWorkflowContext, requireReportWorkflowContext } from '@/lib/reports/report-compliance'

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'reviewer'])
    const { id, reportId } = await ctx.params as { id: string; reportId: string }

    const report = requireReportWorkflowContext(await fetchReportWorkflowContext({
      caseId: id,
      reportId,
      firmId: req.session.firmId,
    }))
    if (report.status !== 'submitted_for_review')
      throw Errors.CONFLICT('Report must be in submitted_for_review status to reject')

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status: 'rejected' },
    })

    await prisma.case.update({
      where: { id },
      data: { stage: 'draft_report' },
    })

    await createAuditEntry(req, {
      action: 'REPORT_REJECTED',
      entityType: 'Report',
      entityId: updated.id,
      before: {
        status: report.status,
        caseStage: report.case.stage,
      },
      after: {
        status: updated.status,
        caseStage: 'draft_report',
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
