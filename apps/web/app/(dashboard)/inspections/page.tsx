import { Suspense } from 'react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { BranchFilter } from '@/components/ui/branch-filter'
import { formatDate } from '@valuation-os/utils'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import Link from 'next/link'

interface SearchParams {
  page?: string
  status?: string
  branchId?: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700',
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  submitted: 'bg-purple-50 text-purple-700',
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
        id: true, status: true, inspectionDate: true, submittedAt: true,
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
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BranchFilter branches={visibleBranches} />
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
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                (params.status ?? 'all') === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Case', 'Inspector', 'Status', 'Inspection Date', 'Submitted', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No inspections found.
                  </td>
                </tr>
              ) : (
                items.map((i: typeof items[0]) => (
                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-gray-900">
                      <Link href={`/cases/${i.case.id}`} className="hover:text-blue-600">
                        {i.case.reference}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {i.inspector.firstName} {i.inspector.lastName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {i.inspectionDate ? formatDate(i.inspectionDate) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {i.submittedAt ? formatDate(i.submittedAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <Link
                        href={`/cases/${i.case.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View case →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
          </Suspense>
        )}
      </div>
    </>
  )
}
