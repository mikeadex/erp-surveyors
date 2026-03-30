import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { FileText, ShieldCheck, Layers3, Clock3 } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { ReportTemplateManager } from '@/components/reports/report-template-manager'

function asTemplateItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string | { id?: string; text?: string } =>
          typeof item === 'string' || (!!item && typeof item === 'object'),
      )
    : []
}

export default async function ReportsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, templates, reportSummary] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.reportTemplate.findMany({
      where: { firmId: session.firmId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    }),
    prisma.report.groupBy({
      by: ['status'],
      where: { firmId: session.firmId },
      _count: true,
    }),
  ])

  if (!user) redirect('/login')

  const summaryMap = Object.fromEntries(
    reportSummary.map((entry) => [entry.status, entry._count]),
  ) as Record<string, number>

  return (
    <>
      <Header user={user} title="Reports" />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.28)] sm:p-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Reporting Hub
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Control report templates, review flow, and output readiness.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Reports are now driven from completed case analysis and inspection data. Use this
                space to manage firm templates, monitor draft volume, and keep final issue aligned
                with your valuation workflow.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Templates
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {templates.length}
                  </p>
                </div>
                <span className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-500">
                  <Layers3 className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Firm-specific template profiles available for new report generations.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Drafts
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {summaryMap.draft ?? 0}
                  </p>
                </div>
                <span className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-500">
                  <FileText className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Generated outputs still being refined before review.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    In Review
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {summaryMap.submitted_for_review ?? 0}
                  </p>
                </div>
                <span className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-500">
                  <Clock3 className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Report versions currently waiting on reviewer sign-off.
              </p>
            </div>

            <div className="rounded-[24px] border border-brand-100 bg-brand-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700/70">
                    Final
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-brand-900">
                    {summaryMap.final ?? 0}
                  </p>
                </div>
                <span className="inline-flex rounded-2xl bg-white/70 p-3 text-brand-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-sm text-brand-800/75">
                Reports approved, issued, and ready for client-facing delivery.
              </p>
            </div>
          </div>
        </section>

        <ReportTemplateManager
          templates={templates.map((template) => ({
            ...template,
            updatedAt: template.updatedAt.toISOString(),
            defaultAssumptions: asTemplateItems(template.defaultAssumptions),
            defaultDisclaimers: asTemplateItems(template.defaultDisclaimers),
          }))}
          canManage={user.role === 'managing_partner' || user.role === 'admin'}
        />
      </div>
    </>
  )
}
