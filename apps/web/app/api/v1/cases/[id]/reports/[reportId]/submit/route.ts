import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { createAuditEntry, fetchReportWorkflowContext, requireReportWorkflowContext } from '@/lib/reports/report-compliance'
import { createNotificationsForUsers } from '@/lib/notifications/workflow'

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id, reportId } = await ctx.params as { id: string; reportId: string }

    const report = requireReportWorkflowContext(await fetchReportWorkflowContext({
      caseId: id,
      reportId,
      firmId: req.session.firmId,
    }))
    if (report.status !== 'draft') {
      throw Errors.CONFLICT('Only draft reports can be submitted for review')
    }
    if (!report.renderedHtml?.trim()) {
      throw Errors.CONFLICT('Generate report content before submitting for review')
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status: 'submitted_for_review' },
    })

    await prisma.case.update({
      where: { id },
      data: { stage: 'review' },
    })

    await createAuditEntry(req, {
      action: 'REPORT_SUBMITTED_FOR_REVIEW',
      entityType: 'Report',
      entityId: updated.id,
      before: {
        status: report.status,
        caseStage: report.case.stage,
      },
      after: {
        status: updated.status,
        caseStage: 'review',
      },
    })

    await createNotificationsForUsers({
      firmId: req.session.firmId,
      userIds: [report.case.assignedReviewerId],
      type: 'review_requested',
      title: 'Report submitted for review',
      body: 'A valuation report is ready for your review.',
      entityType: 'Case',
      entityId: id,
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
