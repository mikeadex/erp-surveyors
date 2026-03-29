import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { formatDate, formatCurrency } from '@valuation-os/utils'

interface SearchParams {
  page?: string
  search?: string
  comparableType?: string
  state?: string
}

export default async function ComparablesPage({
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
  const search = params.search?.trim()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  const where = {
    firmId: session.firmId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(params.comparableType ? { comparableType: params.comparableType as any } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(search
      ? {
          OR: [
            { address: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.comparable.findMany({
      where,
      select: {
        id: true, comparableType: true, address: true, city: true, state: true,
        salePrice: true, rentalValue: true, transactionDate: true,
        plotSize: true, buildingSize: true, source: true, isVerified: true, createdAt: true,
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comparable.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  const TYPE_LABELS: Record<string, string> = {
    sales: 'Sale',
    rental: 'Rental',
    land: 'Land',
  }

  return (
    <>
      <Header user={user} title="Comparables" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search address…"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
            <select className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm">
              <option value="">All types</option>
              <option value="sales">Sales</option>
              <option value="rental">Rental</option>
              <option value="land">Land</option>
            </select>
          </div>
          <Link
href="/comparables/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Comparable
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Type', 'Address', 'Price / Rental', 'Size', 'Date', 'Source', ''].map((h) => (
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
                    No comparables found.
                  </td>
                </tr>
              ) : (
                items.map((c: typeof items[0]) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        {TYPE_LABELS[c.comparableType] ?? c.comparableType}
                      </span>
                      {c.isVerified && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                          ✓
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px]">
                      <p className="truncate">{c.address}</p>
                      <p className="text-xs text-gray-400">
                        {[c.city, c.state].filter(Boolean).join(', ')}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {c.salePrice
                        ? formatCurrency(c.salePrice.toString())
                        : c.rentalValue
                          ? `${formatCurrency(c.rentalValue.toString())}/yr`
                          : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {c.buildingSize
                        ? `${c.buildingSize} sqm`
                        : c.plotSize
                          ? `${c.plotSize} sqm`
                          : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {c.transactionDate ? formatDate(c.transactionDate) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate">
                      {c.source ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <Link
                        href={`/comparables/${c.id}`}
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
