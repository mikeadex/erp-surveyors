import { Suspense } from 'react'
import Link from 'next/link'
import { CalendarClock, CheckCircle2, ClipboardCheck, Hourglass, Send } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { formatDate } from '@valuation-os/utils'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { InspectionsFiltersBar } from '@/components/inspections/inspections-filters-bar'

interface SearchParams {
  page?: string
  status?: string
  branchId?: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  scheduled: 'bg-brand-50 text-brand-700',
  completed: 'bg-brand-50 text-brand-700',
  submitted: 'bg-slate-100 text-slate-700',
}

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = 20
  const skip = (page - 1) * pageSize
  const scopedBranchId = await resolveScopedBranchId(session, params.branchId ?? null)

  const [user, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.branch.findMany({
      where: { firmId: session.firmId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  if (!user) redirect('/login')

  const visibleBranches = canAccessAllBranches(session.role)
    ? branches
    : branches.filter((branch) => branch.id === session.branchId)

  const where = {
    case: {
      firmId: session.firmId,
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(params.status ? { status: params.status as any } : {}),
    ...(['valuer', 'field_officer'].includes(session.role)
      ? { inspectedById: session.userId }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      select: {
        id: true,
        status: true,
        inspectionDate: true,
        submittedAt: true,
        createdAt: true,
        case: { select: { id: true, reference: true } },
        inspector: { select: { id: true, firstName: true, lastName: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inspection.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header user={user} title="Inspections" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Field Operations
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Keep inspections visible from scheduling through submission.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review inspection workload by branch and status while keeping the operations interface aligned with the calmer shell.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {(['all', 'pending', 'scheduled', 'completed', 'submitted'] as const).map((s) => (
            <Link
              key={s}
              href={{
                pathname: '/inspections',
                query: {
                  ...(s === 'all' ? {} : { status: s }),
                  ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
                },
              }}
              className={`surface-card rounded-[24px] px-3.5 py-3.5 transition-colors sm:px-4 sm:py-4 ${
                (params.status ?? 'all') === s
                  ? 'border-brand-200 bg-brand-50/70 text-brand-800'
                  : 'hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {s === 'all' ? 'Overview' : 'Status'}
                  </p>
                  <p className="mt-2 text-sm font-semibold capitalize text-slate-900 sm:text-base">
                    {s === 'all' ? 'All inspections' : s}
                  </p>
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${
                    (params.status ?? 'all') === s
                      ? 'bg-white/80 text-brand-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {s === 'submitted' ? (
                    <Send className="h-4 w-4" />
                  ) : s === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : s === 'scheduled' ? (
                    <CalendarClock className="h-4 w-4" />
                  ) : s === 'pending' ? (
                    <Hourglass className="h-4 w-4" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <InspectionsFiltersBar
          status={params.status}
          branchId={scopedBranchId ?? undefined}
          branches={visibleBranches}
          canAccessAllBranches={canAccessAllBranches(session.role)}
        />

        {items.length === 0 ? (
          <div className="surface-card rounded-[28px] p-12 text-center">
            <p className="text-sm text-slate-500">No inspections found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 xl:hidden">
              {items.map((i: typeof items[0]) => (
                <Link
                  key={i.id}
                  href={`/cases/${i.case.id}`}
                  className="surface-card block rounded-[28px] p-4 transition-colors hover:bg-slate-50/70 sm:p-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex shrink-0 rounded-2xl bg-slate-100 p-2.5">
                        <ClipboardCheck className="h-4 w-4 text-slate-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-lg font-semibold leading-8 text-slate-900">
                              {i.case.reference}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {i.inspector.firstName} {i.inspector.lastName}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_COLORS[i.status] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {i.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Inspection Date
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {i.inspectionDate ? formatDate(i.inspectionDate) : 'Not scheduled'}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Submitted
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {i.submittedAt ? formatDate(i.submittedAt) : 'Not submitted'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
                      <span className="text-slate-400">Open linked case</span>
                      <span className="font-medium text-brand-700">View case</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Case', 'Inspector', 'Status', 'Inspection Date', 'Submitted', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((i: typeof items[0]) => (
                    <tr key={i.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm font-semibold text-slate-900">
                        <Link href={`/cases/${i.case.id}`} className="hover:text-brand-700">
                          {i.case.reference}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        {i.inspector.firstName} {i.inspector.lastName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[i.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {i.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                        {i.inspectionDate ? formatDate(i.inspectionDate) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                        {i.submittedAt ? formatDate(i.submittedAt) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                        <Link
                          href={`/cases/${i.case.id}`}
                          className="font-medium text-brand-700 hover:text-brand-800"
                        >
                          View case →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
          </Suspense>
        )}
      </div>
    </>
  )
}
