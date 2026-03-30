import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { PrintReportClient } from '@/components/reports/print-report-client'

export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>
}) {
  const { id: caseId, reportId } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const report = await prisma.report.findFirst({
    where: { id: reportId, caseId, firmId: session.firmId },
    select: {
      renderedHtml: true,
      case: { select: { reference: true } },
      version: true,
    },
  })

  if (!report) notFound()

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 print:bg-white print:px-0 print:py-0">
      <PrintReportClient />
      <section className="mx-auto max-w-5xl rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.3)] print:max-w-none print:rounded-none print:border-none print:px-0 print:py-0 print:shadow-none">
        {report.renderedHtml ? (
          <div dangerouslySetInnerHTML={{ __html: report.renderedHtml }} />
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center text-slate-500">
            No generated report output is available for {report.case.reference} version {report.version}.
          </div>
        )}
      </section>
    </main>
  )
}
