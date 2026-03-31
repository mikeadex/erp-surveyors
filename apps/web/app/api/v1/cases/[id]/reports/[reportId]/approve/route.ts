import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import {
  assertNoBlockingComments,
  createAuditEntry,
  fetchReportWorkflowContext,
  requireReportWorkflowContext,
} from '@/lib/reports/report-compliance'
import { createNotificationsForUsers } from '@/lib/notifications/workflow'

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
      throw Errors.CONFLICT('Report must be in submitted_for_review status to approve')
    assertNoBlockingComments(report, 'approval')

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'approved',
        approvedById: req.session.userId,
        approvedAt: new Date(),
      },
    })

    await createAuditEntry(req, {
      action: 'REPORT_APPROVED',
      entityType: 'Report',
      entityId: updated.id,
      before: {
        status: report.status,
        approvedById: report.approvedById,
        approvedAt: report.approvedAt?.toISOString() ?? null,
      },
      after: {
        status: updated.status,
        approvedById: updated.approvedById,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
      },
    })

    await createNotificationsForUsers({
      firmId: req.session.firmId,
      userIds: [report.case.assignedValuerId],
      type: 'report_approved',
      title: 'Report approved',
      body: 'Your draft report has been approved and is ready for issue.',
      entityType: 'Case',
      entityId: id,
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
