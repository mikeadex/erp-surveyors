import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'reviewer'])
    const { id, reportId } = await ctx.params as { id: string; reportId: string }

    const report = await prisma.report.findFirst({
      where: { id: reportId, caseId: id, firmId: req.session.firmId },
      include: { comments: { where: { type: 'blocking', isResolved: false } } },
    })
    if (!report) throw Errors.NOT_FOUND('Report')
    if (report.status !== 'submitted_for_review')
      throw Errors.CONFLICT('Report must be in submitted_for_review status to approve')
    if (report.comments.length > 0)
      throw Errors.CONFLICT('All blocking comments must be resolved before approval')

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'approved',
        approvedById: req.session.userId,
        approvedAt: new Date(),
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
