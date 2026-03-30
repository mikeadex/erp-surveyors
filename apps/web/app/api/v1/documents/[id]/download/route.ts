import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { NextResponse } from 'next/server'
import { buildPublicAssetUrl, createPresignedDownloadUrl, hasSignedStorageConfig } from '@/lib/storage/s3'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const doc = await prisma.document.findFirst({
      where: { id, firmId: req.session.firmId, deletedAt: null },
      select: { id: true, name: true, s3Key: true, mimeType: true },
    })

    if (!doc) throw Errors.NOT_FOUND('Document')

    const downloadUrl = hasSignedStorageConfig()
      ? await createPresignedDownloadUrl({ key: doc.s3Key })
      : buildPublicAssetUrl(doc.s3Key)
    if (!downloadUrl) throw Errors.INTERNAL()

    if (req.nextUrl.searchParams.get('format') === 'json') {
      return ok({
        url: downloadUrl,
        name: doc.name,
        mimeType: doc.mimeType,
      })
    }

    return NextResponse.redirect(downloadUrl, { status: 302 })
  } catch (err) {
    return errorResponse(err)
  }
})
