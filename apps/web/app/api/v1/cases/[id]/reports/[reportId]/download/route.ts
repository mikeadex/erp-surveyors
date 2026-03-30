import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { NextResponse } from 'next/server'

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, reportId } = await ctx.params as { id: string; reportId: string }

    const report = await prisma.report.findFirst({
      where: { id: reportId, caseId: id, firmId: req.session.firmId },
      include: {
        case: { select: { reference: true } },
      },
    })
    if (!report) throw Errors.NOT_FOUND('Report')
    if (!report.renderedHtml?.trim()) {
      throw Errors.CONFLICT('Report does not have generated output to download')
    }

    const filename = `${slugify(report.case.reference)}-report-v${report.version}.html`

    return new NextResponse(report.renderedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
})
