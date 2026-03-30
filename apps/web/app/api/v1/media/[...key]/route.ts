import { NextResponse } from 'next/server'
import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { buildPublicAssetUrl, createPresignedDownloadUrl, hasSignedStorageConfig } from '@/lib/storage/s3'

export const GET = withAuth(async (
  req: AuthedRequest,
  ctx: { params: Promise<{ key: string[] }> },
) => {
  try {
    const { key } = await ctx.params
    const assetKey = key.join('/')
    const media = await prisma.inspectionMedia.findFirst({
      where: {
        s3Key: assetKey,
        inspection: {
          case: {
            firmId: req.session.firmId,
          },
        },
      },
      select: { id: true, s3Key: true },
    })
    if (!media) throw Errors.NOT_FOUND('Inspection media')

    const assetUrl = hasSignedStorageConfig()
      ? await createPresignedDownloadUrl({ key: assetKey })
      : buildPublicAssetUrl(assetKey)
    if (!assetUrl) throw Errors.INTERNAL()

    return NextResponse.redirect(assetUrl, { status: 302 })
  } catch (err) {
    return errorResponse(err)
  }
})
