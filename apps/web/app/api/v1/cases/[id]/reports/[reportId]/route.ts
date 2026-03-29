import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, reportId } = await ctx.params as { id: string; reportId: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const report = await prisma.report.findFirst({
      where: { id: reportId, caseId: id },
      include: {
        template: { select: { id: true, name: true, valuationType: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!report) throw Errors.NOT_FOUND('Report')

    return ok(report)
  } catch (err) {
    return errorResponse(err)
  }
})
