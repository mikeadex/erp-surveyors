import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { z } from 'zod'
import { createAuditEntry } from '@/lib/reports/report-compliance'
import { createNotificationsForUsers } from '@/lib/notifications/workflow'

const CreateCommentSchema = z.object({
  type: z.enum(['blocking', 'suggestion', 'informational']),
  body: z.string().min(1).max(5000),
})

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, reportId } = await ctx.params as { id: string; reportId: string }

    const report = await prisma.report.findFirst({
      where: { id: reportId, caseId: id, firmId: req.session.firmId },
      select: {
        id: true,
        case: {
          select: {
            id: true,
            assignedValuerId: true,
          },
        },
      },
    })
    if (!report) throw Errors.NOT_FOUND('Report')

    const comments = await prisma.reviewComment.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    })

    return ok(comments)
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'reviewer'])
    const { id, reportId } = await ctx.params as { id: string; reportId: string }
    const body = CreateCommentSchema.parse(await req.json())

    const report = await prisma.report.findFirst({
      where: { id: reportId, caseId: id, firmId: req.session.firmId },
      select: {
        id: true,
        case: {
          select: {
            id: true,
            assignedValuerId: true,
          },
        },
      },
    })
    if (!report) throw Errors.NOT_FOUND('Report')

    const comment = await prisma.reviewComment.create({
      data: {
        reportId,
        firmId: req.session.firmId,
        authorId: req.session.userId,
        type: body.type,
        body: body.body,
      },
    })

    await createAuditEntry(req, {
      action: 'REVIEW_COMMENT_ADDED',
      entityType: 'ReviewComment',
      entityId: comment.id,
      after: {
        reportId,
        type: comment.type,
        isResolved: comment.isResolved,
      },
    })

    await createNotificationsForUsers({
      firmId: req.session.firmId,
      userIds: [report.case.assignedValuerId],
      type: 'comment_added',
      title: body.type === 'blocking' ? 'Blocking review comment added' : 'Review comment added',
      body: body.body.slice(0, 180),
      entityType: 'Case',
      entityId: id,
    })

    return ok(comment, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
