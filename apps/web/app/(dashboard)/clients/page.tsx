import { Suspense } from 'react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ClientsTable } from '@/components/clients/clients-table'
import { ClientSavedViews } from '@/components/clients/client-saved-views'
import { ClientsFiltersBar } from '@/components/clients/clients-filters-bar'
import { Pagination } from '@/components/ui/pagination'
import { canAccessAllBranches } from '@/lib/auth/branch-scope'
import { buildClientSearchWhere } from '@/lib/crm/client-records'
import { CreateClientModalTrigger } from '@/components/clients/create-client-modal-trigger'

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
  const visibleBranches = canAccessAllBranches(session.role)
    ? branches
    : branches.filter((branch) => branch.id === session.branchId)
  const initialClientBranchId =
    session.branchId ?? (visibleBranches.length === 1 ? visibleBranches[0]?.id : undefined)
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
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Relationship Hub
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Manage client relationships, ownership, and intake readiness.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Search by identity, branch, and relationship notes while keeping the CRM aligned with the calmer dashboard shell.
              </p>
            </div>
            <CreateClientModalTrigger
              branches={visibleBranches}
              initialBranchId={initialClientBranchId}
              canSelectBranch={canAccessAllBranches(session.role)}
            />
          </div>
        </section>

        <ClientSavedViews views={savedViews} />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-1 flex-col gap-3">
            <ClientsFiltersBar
              search={search}
              type={type}
              status={status}
              tag={tag}
              branchId={scopedBranchId}
              branchState={branchState}
              canAccessAllBranches={canAccessAllBranches(session.role)}
              branches={branches}
            />
          </div>
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
