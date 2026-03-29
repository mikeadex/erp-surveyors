import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, AlertCircle, type LucideIcon } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  draft: { label: 'Draft', icon: Clock, color: 'text-gray-500' },
  submitted_for_review: { label: 'Under Review', icon: AlertCircle, color: 'text-yellow-600' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-600' },
  final: { label: 'Final', icon: CheckCircle, color: 'text-blue-600' },
}

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, caseRecord] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.case.findFirst({
      where: { id: caseId, firmId: session.firmId },
      select: {
        id: true, reference: true,
        reports: {
          include: {
            template: { select: { name: true } },
            comments: { select: { id: true, type: true, isResolved: true } },
          },
          orderBy: { version: 'desc' },
        },
      },
    }),
  ])

  if (!user) redirect('/login')
  if (!caseRecord) notFound()

  return (
    <>
      <Header user={user} title={`Reports — ${caseRecord.reference}`} />
      <div className="p-6 max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/cases/${caseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to case
          </Link>
          <form action={`/api/v1/cases/${caseId}/reports`} method="POST">
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Generate New Version
            </button>
          </form>
        </div>

        {caseRecord.reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-500">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium">No reports yet</p>
            <p className="text-sm">Generate the first report version above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {caseRecord.reports.map((report) => {
              const cfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft
              const Icon = cfg.icon
              const blockingOpen = report.comments.filter(c => c.type === 'blocking' && !c.isResolved).length
              return (
                <Link
                  key={report.id}
                  href={`/cases/${caseId}/reports/${report.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Version {report.version}</p>
                      <p className="text-sm text-gray-500">
                        {report.template?.name ?? 'No template'} · {report.comments.length} comment{report.comments.length !== 1 ? 's' : ''}
                        {blockingOpen > 0 && (
                          <span className="ml-2 text-red-600 font-medium">· {blockingOpen} blocking</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
