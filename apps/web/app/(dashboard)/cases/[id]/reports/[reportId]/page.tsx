import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, CheckCircle2, Clock3, Download, FileText, FileDown, XCircle, type LucideIcon } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { formatDateTime } from '@valuation-os/utils'
import { ReportReviewPanel } from '@/components/reports/report-review-panel'
import { ReportPrintTrigger } from '@/components/reports/report-print-trigger'

const STATUS_CONFIG: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  draft: {
    label: 'Draft',
    icon: Clock3,
    className: 'bg-slate-100 text-slate-700',
  },
  submitted_for_review: {
    label: 'Under Review',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-700',
  },
  final: {
    label: 'Final',
    icon: CheckCircle2,
    className: 'bg-brand-50 text-brand-700',
  },
}

export default async function ReportPreviewPage({
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

  const [user, report] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.report.findFirst({
      where: { id: reportId, caseId, firmId: session.firmId },
      include: {
        template: { select: { id: true, name: true, valuationType: true } },
        case: {
          select: {
            id: true,
            reference: true,
            valuationType: true,
            updatedAt: true,
            assignedValuerId: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            body: true,
            isResolved: true,
            authorId: true,
            resolvedById: true,
            resolvedAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ])

  if (!user) redirect('/login')
  if (!report) notFound()

  const relatedUserIds = [
    ...new Set(
      report.comments.flatMap((comment) => [
        comment.authorId,
        comment.resolvedById,
      ]).filter((value): value is string => Boolean(value)),
    ),
  ]

  const relatedUsers = relatedUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: relatedUserIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : []

  const userNameMap = new Map(
    relatedUsers.map((entry) => [entry.id, `${entry.firstName} ${entry.lastName}`.trim()]),
  )

  const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft
  const StatusIcon = status.icon
  const blockingOpen = report.comments.filter(
    (comment) => comment.type === 'blocking' && !comment.isResolved,
  ).length
  const commentItems = report.comments.map((comment) => ({
    id: comment.id,
    type: comment.type,
    body: comment.body,
    isResolved: comment.isResolved,
    createdLabel: formatDateTime(comment.createdAt),
    authorName: userNameMap.get(comment.authorId) ?? 'Team member',
    resolvedByName: comment.resolvedById
      ? userNameMap.get(comment.resolvedById) ?? 'Team member'
      : null,
    resolvedLabel: comment.resolvedAt ? formatDateTime(comment.resolvedAt) : null,
  }))

  return (
    <>
      <Header user={user} title={`Report Preview — ${report.case.reference}`} />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.28)] sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Link
                href={`/cases/${caseId}/reports`}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to reports
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Report Preview
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {report.case.reference} · Version {report.version}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Review the generated draft output, template binding, and report status before
                  sending it into review or final issue.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <ReportPrintTrigger href={`/cases/${caseId}/reports/${reportId}/print`} />
              <a
                href={`/api/v1/cases/${caseId}/reports/${reportId}/download`}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download HTML
              </a>
              <a
                href={`/api/v1/cases/${caseId}/reports/${reportId}/download?format=pdf`}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </a>
              <div className="flex items-center gap-3 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${status.className}`}>
                  <StatusIcon className="h-4 w-4" />
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Template
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                {report.template?.name ?? 'Built-in standard template'}
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Generated
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                {formatDateTime(report.generatedAt ?? report.createdAt)}
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Comments
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                {report.comments.length} total
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Blocking
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                {blockingOpen} unresolved
              </p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.3)]">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-4 text-sm text-slate-500">
            <FileText className="h-4 w-4 text-brand-700" />
            Generated Draft Output
          </div>
          <div className="overflow-x-auto bg-white px-4 py-5 sm:px-8 sm:py-8">
            {report.renderedHtml ? (
              <div
                className="min-w-[820px]"
                dangerouslySetInnerHTML={{ __html: report.renderedHtml }}
              />
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center text-slate-500">
                This report version does not have generated draft content yet.
              </div>
            )}
          </div>
        </section>

        <ReportReviewPanel
          caseId={caseId}
          reportId={reportId}
          status={report.status}
          currentRole={user.role}
          canResolveComments={
            user.role === 'managing_partner'
            || (user.role === 'valuer' && report.case.assignedValuerId === user.id)
          }
          comments={commentItems}
        />
      </div>
    </>
  )
}
