import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { z } from 'zod'

const ConfirmInspectionMediaSchema = z.object({
  caption: z.string().trim().max(300).optional(),
  takenAt: z.string().datetime().optional(),
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer', 'field_officer'])
    const { id: caseId, inspectionId, mediaId } = await ctx.params as {
      id: string
      inspectionId: string
      mediaId: string
    }
    const body = ConfirmInspectionMediaSchema.parse(await req.json().catch(() => ({})))
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const inspection = await prisma.inspection.findFirst({
      where: {
        id: inspectionId,
        caseId,
        case: {
          firmId: req.session.firmId,
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        },
      },
      select: { id: true, status: true, caseId: true },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')
    if (inspection.status === 'submitted') {
      throw Errors.CONFLICT('Submitted inspections cannot be edited')
    }

    const existing = await prisma.inspectionMedia.findFirst({
      where: { id: mediaId, inspectionId },
      select: { id: true, caption: true, s3Key: true },
    })
    if (!existing) throw Errors.NOT_FOUND('Inspection media')

    const media = await prisma.inspectionMedia.update({
      where: { id: mediaId },
      data: {
        ...(body.caption !== undefined ? { caption: body.caption || null } : {}),
        takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
      },
      select: { id: true, inspectionId: true, s3Key: true, caption: true, takenAt: true, sortOrder: true },
    })

    await prisma.auditLog.create({
      data: {
        firmId: req.session.firmId,
        userId: req.session.userId,
        action: 'CASE_INSPECTION_MEDIA_ADDED',
        entityType: 'Case',
        entityId: caseId,
        after: {
          mediaId: media.id,
          caption: media.caption,
          s3Key: media.s3Key,
        } as any,
      },
    })

    return ok(media)
  } catch (err) {
    return errorResponse(err)
  }
})
