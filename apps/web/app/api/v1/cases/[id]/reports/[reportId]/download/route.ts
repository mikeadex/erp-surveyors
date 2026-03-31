import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { NextResponse } from 'next/server'
import { buildReportPdfBytes } from '@/lib/reports/report-pdf'
import { formatDateTime } from '@valuation-os/utils'

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, reportId } = await ctx.params as { id: string; reportId: string }
    const format = req.nextUrl.searchParams.get('format')?.toLowerCase()

    const report = await prisma.report.findFirst({
      where: { id: reportId, caseId: id, firmId: req.session.firmId },
      include: {
        case: { select: { reference: true } },
        template: { select: { name: true } },
      },
    })
    if (!report) throw Errors.NOT_FOUND('Report')
    if (!report.renderedHtml?.trim()) {
      throw Errors.CONFLICT('Report does not have generated output to download')
    }

    if (format === 'pdf') {
      const filename = `${slugify(report.case.reference)}-report-v${report.version}.pdf`
      const pdfBytes = await buildReportPdfBytes({
        title: `${report.case.reference} Valuation Report`,
        subtitle: `${report.template?.name ?? 'Standard valuation template'}`,
        status: report.status.replace(/_/g, ' '),
        versionLabel: `Version ${report.version}`,
        generatedOn: formatDateTime(report.generatedAt ?? report.createdAt),
        html: report.renderedHtml,
      })

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
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
