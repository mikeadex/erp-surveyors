import { Suspense } from 'react'
import Link from 'next/link'
import { FileText, Landmark, Receipt, Wallet } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { BranchFilter } from '@/components/ui/branch-filter'
import { InvoicesFiltersBar } from '@/components/invoices/invoices-filters-bar'
import { formatDate, formatCurrency } from '@valuation-os/utils'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'

interface SearchParams {
  page?: string
  status?: string
  branchId?: string
  search?: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-brand-50 text-brand-700',
  paid: 'bg-brand-50 text-brand-700',
  partial: 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700',
  void: 'bg-slate-100 text-slate-400',
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
  const search = params.search?.trim()
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
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
            { client: { name: { contains: search, mode: 'insensitive' as const } } },
            { case: { reference: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [items, total, summary] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        amount: true,
        totalAmount: true,
        currency: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
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
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Finance Desk
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Monitor billing, payment status, and revenue follow-through.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep invoices visible by status and branch while staying aligned with the calmer dashboard shell.
              </p>
            </div>
            <div className="flex w-full justify-start lg:w-auto lg:justify-end">
              <BranchFilter branches={visibleBranches} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
                    {s === 'all' ? 'All invoices' : s}
                  </p>
                  {s === 'paid' ? (
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                      {formatCurrency((summary._sum.totalAmount ?? 0).toString())} collected
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                      {s === 'sent'
                        ? 'Issued and awaiting payment'
                        : s === 'overdue'
                          ? 'Needs finance follow-up'
                          : 'Full invoice register'}
                    </p>
                  )}
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${
                    (params.status ?? 'all') === s
                      ? 'bg-white/80 text-brand-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {s === 'paid' ? (
                    <Wallet className="h-4 w-4" />
                  ) : s === 'overdue' ? (
                    <Landmark className="h-4 w-4" />
                  ) : s === 'sent' ? (
                    <Receipt className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <InvoicesFiltersBar
          search={search}
          status={params.status}
          branchId={scopedBranchId ?? undefined}
        />

        {items.length === 0 ? (
          <div className="surface-card rounded-[28px] p-12 text-center">
            <p className="text-sm text-slate-500">No invoices found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 xl:hidden">
              {items.map((inv: typeof items[0]) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="surface-card block rounded-[28px] p-4 transition-colors hover:bg-slate-50/70 sm:p-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex shrink-0 rounded-2xl bg-slate-100 p-2.5">
                        <Receipt className="h-4 w-4 text-slate-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-lg font-semibold leading-8 text-slate-900">
                              {inv.invoiceNumber}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-500">{inv.client.name}</p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_COLORS[inv.status] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {inv.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xl font-semibold text-slate-950">
                          {formatCurrency(inv.totalAmount.toString(), inv.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Case
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{inv.case.reference}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Created {formatDate(inv.createdAt)}
                        </p>
                      </div>

                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Due
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {inv.dueDate ? formatDate(inv.dueDate) : 'No due date'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {inv.paidAt ? `Paid ${formatDate(inv.paidAt)}` : 'Payment pending'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
                      <span className="text-slate-400">Open invoice record</span>
                      <span className="font-medium text-brand-700">View invoice</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Invoice #', 'Client', 'Case', 'Amount', 'Status', 'Due', ''].map((h) => (
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
                  {items.map((inv: typeof items[0]) => (
                    <tr key={inv.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm font-semibold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-900">{inv.client.name}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        <Link href={`/cases/${inv.case.id}`} className="text-brand-700 hover:underline">
                          {inv.case.reference}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(inv.totalAmount.toString(), inv.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                        {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-brand-700 hover:text-brand-800"
                        >
                          View →
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
