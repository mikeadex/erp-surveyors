import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import {
  assertNoBlockingComments,
  assertReadyForIssue,
  createAuditEntry,
  fetchReportWorkflowContext,
  requireReportWorkflowContext,
} from '@/lib/reports/report-compliance'

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'reviewer'])
    const { id, reportId } = await ctx.params as { id: string; reportId: string }

    const report = requireReportWorkflowContext(await fetchReportWorkflowContext({
      caseId: id,
      reportId,
      firmId: req.session.firmId,
    }))
    if (report.status !== 'approved')
      throw Errors.CONFLICT('Report must be approved before it can be issued')
    assertNoBlockingComments(report, 'final issue')
    assertReadyForIssue(report)

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status: 'final', generatedAt: new Date() },
    })

    await prisma.case.update({
      where: { id },
      data: { stage: 'final_issued' },
    })

    await createAuditEntry(req, {
      action: 'REPORT_ISSUED',
      entityType: 'Report',
      entityId: updated.id,
      before: {
        status: report.status,
        caseStage: report.case.stage,
      },
      after: {
        status: updated.status,
        caseStage: 'final_issued',
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
