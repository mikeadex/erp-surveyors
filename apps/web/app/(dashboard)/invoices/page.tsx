import { Suspense } from 'react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { BranchFilter } from '@/components/ui/branch-filter'
import { formatDate, formatCurrency } from '@valuation-os/utils'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import Link from 'next/link'

interface SearchParams {
  page?: string
  status?: string
  branchId?: string
}

const STATUS_COLORS: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600',
  sent:    'bg-blue-50 text-blue-700',
  paid:    'bg-green-50 text-green-700',
  partial: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-50 text-red-700',
  void:    'bg-gray-100 text-gray-400',
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  if (!['managing_partner', 'admin', 'finance'].includes(session.role)) redirect('/dashboard')

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
    firmId: session.firmId,
    ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(params.status ? { status: params.status as any } : {}),
  }

  const [items, total, summary] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true, invoiceNumber: true, status: true,
        amount: true, totalAmount: true, currency: true,
        dueDate: true, paidAt: true, createdAt: true,
        case: { select: { id: true, reference: true } },
        client: { select: { id: true, name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({
      where: {
        firmId: session.firmId,
        ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
        status: 'paid',
      },
      _sum: { totalAmount: true },
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header user={user} title="Invoices" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-end">
          <BranchFilter branches={visibleBranches} />
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['all', 'sent', 'overdue', 'paid'] as const).map((s) => (
            <Link
              key={s}
              href={{
                pathname: '/invoices',
                query: {
                  ...(s === 'all' ? {} : { status: s }),
                  ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
                },
              }}
              className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                (params.status ?? 'all') === s
                  ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <p className="font-medium capitalize">{s === 'all' ? 'All' : s}</p>
              {s === 'paid' && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatCurrency((summary._sum.totalAmount ?? 0).toString())} collected
                </p>
              )}
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Invoice #', 'Client', 'Case', 'Amount', 'Status', 'Due', ''].map((h) => (
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
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                items.map((inv: typeof items[0]) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-gray-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {inv.client.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      <Link
                        href={`/cases/${inv.case.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {inv.case.reference}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(inv.totalAmount.toString(), inv.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View →
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
