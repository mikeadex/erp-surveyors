import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { created, errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { createPresignedUploadUrl, hasSignedStorageConfig } from '@/lib/storage/s3'
import { z } from 'zod'

const CreateInspectionMediaSchema = z.object({
  section: z.enum([
    'external_condition',
    'internal_condition',
    'services',
    'surroundings',
    'other',
  ]).default('other'),
  fileType: z.string().trim().refine((value) => value.startsWith('image/'), 'Only image uploads are supported'),
  caption: z.string().trim().max(300).optional(),
})

function extensionFromMimeType(fileType: string) {
  const [, subtype = 'jpg'] = fileType.split('/')
  return subtype === 'jpeg' ? 'jpg' : subtype.replace(/[^a-z0-9]+/gi, '').toLowerCase()
}

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id: caseId, inspectionId } = await ctx.params as { id: string; inspectionId: string }
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, caseId },
      select: {
        id: true,
        media: {
          select: { id: true, inspectionId: true, s3Key: true, caption: true, takenAt: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { takenAt: 'asc' }],
        },
      },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')

    return ok(inspection.media)
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer', 'field_officer'])
    if (!hasSignedStorageConfig()) {
      throw Errors.BAD_REQUEST('Storage upload is not configured for this environment')
    }

    const { id: caseId, inspectionId } = await ctx.params as { id: string; inspectionId: string }
    const body = CreateInspectionMediaSchema.parse(await req.json())
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
      select: {
        id: true,
        status: true,
        caseId: true,
      },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')
    if (inspection.status === 'submitted') {
      throw Errors.CONFLICT('Submitted inspections cannot accept new photos')
    }

    const maxSort = await prisma.inspectionMedia.aggregate({
      where: { inspectionId },
      _max: { sortOrder: true },
    })

    const fileKey = [
      'inspections',
      caseId,
      inspectionId,
      body.section,
      `${Date.now()}-${crypto.randomUUID()}.${extensionFromMimeType(body.fileType)}`,
    ].join('/')

    const media = await prisma.inspectionMedia.create({
      data: {
        inspectionId,
        s3Key: fileKey,
        caption: body.caption || null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      select: { id: true, inspectionId: true, s3Key: true, caption: true, takenAt: true, sortOrder: true },
    })

    const uploadUrl = await createPresignedUploadUrl({
      key: fileKey,
      contentType: body.fileType,
    })

    return created({
      mediaId: media.id,
      fileKey,
      uploadUrl,
      media,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
