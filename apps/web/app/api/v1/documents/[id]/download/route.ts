import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const doc = await prisma.document.findFirst({
      where: { id, firmId: req.session.firmId, deletedAt: null },
      select: { id: true, name: true, s3Key: true, mimeType: true },
    })

    if (!doc) throw Errors.NOT_FOUND('Document')

    const s3BaseUrl = process.env.S3_PUBLIC_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_URL
    if (!s3BaseUrl) throw Errors.INTERNAL()

    const downloadUrl = `${s3BaseUrl.replace(/\/$/, '')}/${doc.s3Key}`

    return NextResponse.redirect(downloadUrl, { status: 302 })
  } catch (err) {
    return errorResponse(err)
  }
})
