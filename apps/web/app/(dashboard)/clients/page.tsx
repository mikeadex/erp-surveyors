import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ClientsTable } from '@/components/clients/clients-table'
import { Pagination } from '@/components/ui/pagination'
import { canAccessAllBranches } from '@/lib/auth/branch-scope'
import { BranchFilter } from '@/components/ui/branch-filter'

interface SearchParams {
  page?: string
  search?: string
  type?: string
  tag?: string
  branchId?: string
}

export default async function ClientsPage({
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
  const type = params.type as 'individual' | 'corporate' | undefined
  const tag = params.tag?.trim().toLowerCase()
  const requestedBranchId = params.branchId?.trim()
  const scopedBranchId = canAccessAllBranches(session.role)
    ? requestedBranchId || undefined
    : session.branchId ?? undefined

  const where = {
    firmId: session.firmId,
    deletedAt: null,
    ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
    ...(type ? { type } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { rcNumber: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
            { state: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  const [clients, total, branches] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true, branchId: true, type: true, name: true, email: true,
        phone: true, city: true, state: true, createdAt: true,
        tags: true,
        branch: { select: { id: true, name: true } },
        _count: { select: { cases: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.count({ where }),
    prisma.branch.findMany({
      where: { firmId: session.firmId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header user={user} title="Clients" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <form className="flex items-center gap-3" method="GET">
              {scopedBranchId && <input type="hidden" name="branchId" value={scopedBranchId} />}
              <input
                type="search"
                placeholder="Search clients…"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                name="search"
                defaultValue={search}
              />
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
                name="type"
                defaultValue={type ?? ''}
              >
                <option value="">All types</option>
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
              </select>
              <input
                type="search"
                placeholder="Tag…"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
                name="tag"
                defaultValue={tag}
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply
              </button>
              {(search || type || tag) && (
                <Link
                  href={scopedBranchId ? `/clients?branchId=${scopedBranchId}` : '/clients'}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </Link>
              )}
            </form>
            {canAccessAllBranches(session.role) && (
              <BranchFilter branches={branches} allLabel="All client branches" />
            )}
          </div>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Client
          </Link>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ClientsTable clients={clients as any} />

        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
          </Suspense>
        )}
      </div>
    </>
  )
}
