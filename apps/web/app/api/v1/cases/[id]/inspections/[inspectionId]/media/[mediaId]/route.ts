import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { deleteStorageObject, hasSignedStorageConfig } from '@/lib/storage/s3'

export const DELETE = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer', 'field_officer'])
    const { id: caseId, inspectionId, mediaId } = await ctx.params as {
      id: string
      inspectionId: string
      mediaId: string
    }
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
      select: { id: true, status: true },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')
    if (inspection.status === 'submitted') {
      throw Errors.CONFLICT('Submitted inspections cannot be edited')
    }

    const media = await prisma.inspectionMedia.findFirst({
      where: { id: mediaId, inspectionId },
      select: { id: true, s3Key: true, caption: true },
    })
    if (!media) throw Errors.NOT_FOUND('Inspection media')

    await prisma.inspectionMedia.delete({
      where: { id: mediaId },
    })

    if (hasSignedStorageConfig()) {
      await deleteStorageObject(media.s3Key).catch(() => null)
    }

    await prisma.auditLog.create({
      data: {
        firmId: req.session.firmId,
        userId: req.session.userId,
        action: 'CASE_INSPECTION_MEDIA_DELETED',
        entityType: 'Case',
        entityId: caseId,
        before: {
          mediaId: media.id,
          caption: media.caption,
          s3Key: media.s3Key,
        } as any,
      },
    })

    return ok({ success: true })
  } catch (err) {
    return errorResponse(err)
  }
})
