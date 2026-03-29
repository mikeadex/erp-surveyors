import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ClientsTable } from '@/components/clients/clients-table'
import { ClientSavedViews } from '@/components/clients/client-saved-views'
import { Pagination } from '@/components/ui/pagination'
import { canAccessAllBranches } from '@/lib/auth/branch-scope'
import { BranchFilter } from '@/components/ui/branch-filter'
import { buildClientSearchWhere } from '@/lib/crm/client-records'

interface SearchParams {
  page?: string
  search?: string
  type?: string
  tag?: string
  branchId?: string
  branchState?: string
  status?: string
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
  const branchState = params.branchState === 'unassigned' ? 'unassigned' : undefined
  const status = params.status === 'archived' || params.status === 'all' ? params.status : 'active'
  const requestedBranchId = params.branchId?.trim()
  const scopedBranchId = canAccessAllBranches(session.role)
    ? requestedBranchId || undefined
    : session.branchId ?? undefined

  function buildViewHref(next: Partial<Record<'status' | 'type' | 'tag' | 'branchId' | 'branchState', string>>) {
    const query = new URLSearchParams()
    const branchValue = next.branchId ?? scopedBranchId

    if (next.branchState) {
      query.set('branchState', next.branchState)
    } else if (branchValue) {
      query.set('branchId', branchValue)
    }
    if (next.status && next.status !== 'active') query.set('status', next.status)
    if (next.type) query.set('type', next.type)
    if (next.tag) query.set('tag', next.tag)

    return query.size > 0 ? `/clients?${query.toString()}` : '/clients'
  }

  const where = {
    firmId: session.firmId,
    ...(status === 'archived'
      ? { deletedAt: { not: null } }
      : status === 'all'
        ? {}
        : { deletedAt: null }),
    ...(branchState === 'unassigned'
      ? { branchId: null }
      : scopedBranchId
        ? { branchId: scopedBranchId }
        : {}),
    ...(type ? { type } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(buildClientSearchWhere(search) ?? {}),
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  const baseScope = {
    firmId: session.firmId,
    ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
  }

  const [clients, total, branches, activeCount, corporateCount, priorityCount, archivedCount, unassignedCount] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true, branchId: true, type: true, name: true, email: true,
        phone: true, city: true, state: true, rcNumber: true, notes: true, createdAt: true, deletedAt: true,
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
    prisma.client.count({
      where: {
        ...baseScope,
        deletedAt: null,
      },
    }),
    prisma.client.count({
      where: {
        ...baseScope,
        deletedAt: null,
        type: 'corporate',
      },
    }),
    prisma.client.count({
      where: {
        ...baseScope,
        deletedAt: null,
        tags: { has: 'priority' },
      },
    }),
    prisma.client.count({
      where: {
        ...baseScope,
        deletedAt: { not: null },
      },
    }),
    canAccessAllBranches(session.role)
      ? prisma.client.count({
          where: {
            firmId: session.firmId,
            deletedAt: null,
            branchId: null,
          },
        })
      : Promise.resolve(0),
  ])

  const totalPages = Math.ceil(total / pageSize)
  const savedViews = [
    {
      key: 'active',
      label: 'Active Clients',
      description: 'Current working relationships',
      count: activeCount,
      href: buildViewHref({ status: 'active' }),
      active: status === 'active' && !type && !tag && !search,
    },
    {
      key: 'corporate',
      label: 'Corporate',
      description: 'Institutional and company clients',
      count: corporateCount,
      href: buildViewHref({ status: 'active', type: 'corporate' }),
      active: status === 'active' && type === 'corporate' && !tag && !search,
    },
    {
      key: 'priority',
      label: 'Priority',
      description: 'Tagged for high-touch handling',
      count: priorityCount,
      href: buildViewHref({ status: 'active', tag: 'priority' }),
      active: status === 'active' && tag === 'priority' && !type && !search,
    },
    {
      key: 'archived',
      label: 'Archived',
      description: 'Inactive client records',
      count: archivedCount,
      href: buildViewHref({ status: 'archived' }),
      active: status === 'archived' && !type && !tag && !search,
    },
    ...(canAccessAllBranches(session.role)
      ? [
          {
            key: 'unassigned',
            label: 'Needs Branch',
            description: 'Legacy clients awaiting ownership',
            count: unassignedCount,
            href: buildViewHref({ status: 'active', branchState: 'unassigned' }),
            active: status === 'active' && branchState === 'unassigned' && !type && !tag && !search,
          },
        ]
      : []),
  ]

  return (
    <>
      <Header user={user} title="Clients" />
      <div className="p-6 space-y-4">
        <ClientSavedViews views={savedViews} />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-1 flex-col gap-3">
            <form className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.75fr))_minmax(0,0.9fr)_auto_auto]" method="GET">
              {scopedBranchId && <input type="hidden" name="branchId" value={scopedBranchId} />}
              <input
                type="search"
                placeholder="Search name, email, phone, RC number, address, notes, tags, or branch…"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
                name="status"
                defaultValue={status}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
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
              {(search || type || tag || status !== 'active') && (
                <Link
                  href={scopedBranchId ? `/clients?branchId=${scopedBranchId}` : '/clients'}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </Link>
              )}
            </form>
            {canAccessAllBranches(session.role) && (
              <BranchFilter branches={branches} allLabel="All client branches" clearKeys={['page', 'branchState']} />
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
