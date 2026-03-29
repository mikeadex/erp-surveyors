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
    if (report.status !== 'approved')
      throw Errors.CONFLICT('Report must be approved before it can be issued')
    if (report.comments.length > 0)
      throw Errors.CONFLICT('All blocking comments must be resolved before issuing')

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status: 'final', generatedAt: new Date() },
    })

    await prisma.case.update({
      where: { id },
      data: { stage: 'final_issued' },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
