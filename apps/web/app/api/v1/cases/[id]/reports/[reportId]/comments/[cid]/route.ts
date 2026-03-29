import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id, reportId, cid } = await ctx.params as { id: string; reportId: string; cid: string }

    const report = await prisma.report.findFirst({
      where: { id: reportId, caseId: id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!report) throw Errors.NOT_FOUND('Report')

    const comment = await prisma.reviewComment.findFirst({
      where: { id: cid, reportId },
    })
    if (!comment) throw Errors.NOT_FOUND('Comment')
    if (comment.isResolved) throw Errors.CONFLICT('Comment already resolved')

    const updated = await prisma.reviewComment.update({
      where: { id: cid },
      data: {
        isResolved: true,
        resolvedById: req.session.userId,
        resolvedAt: new Date(),
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
