import { Suspense } from 'react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { CasesTable } from '@/components/cases/cases-table'
import { CasesFilters } from '@/components/cases/cases-filters'
import { Pagination } from '@/components/ui/pagination'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import type { CaseStage } from '@valuation-os/types'
import { CreateCaseModalTrigger } from '@/components/cases/create-case-modal-trigger'

interface SearchParams {
  page?: string
  search?: string
  stage?: string
  isOverdue?: string
  assignedToMe?: string
  branchId?: string
}

export default async function CasesPage({
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

  const stage = params.stage as CaseStage | undefined
  const isOverdue = params.isOverdue === 'true' ? true : undefined
  const assignedToMe = params.assignedToMe === 'true'
  const search = params.search?.trim()
  const scopedBranchId = await resolveScopedBranchId(session, params.branchId ?? null)

  const where = {
    firmId: session.firmId,
    ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
    ...(stage ? { stage } : {}),
    ...(isOverdue !== undefined ? { isOverdue } : {}),
    ...(assignedToMe
      ? { OR: [{ assignedValuerId: session.userId }, { assignedReviewerId: session.userId }] }
      : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: 'insensitive' as const } },
            { client: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [user, branches, clients, properties, valuers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.branch.findMany({
      where: { firmId: session.firmId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: {
        firmId: session.firmId,
        deletedAt: null,
        ...(session.branchId && !canAccessAllBranches(session.role) ? { branchId: session.branchId } : {}),
      },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    prisma.property.findMany({
      where: { firmId: session.firmId, deletedAt: null },
      select: { id: true, address: true, city: true, state: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.user.findMany({
      where: {
        firmId: session.firmId,
        isActive: true,
        ...(session.branchId && !canAccessAllBranches(session.role) ? { branchId: session.branchId } : {}),
        role: { in: ['valuer', 'reviewer', 'managing_partner'] },
      },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ])
  if (!user) redirect('/login')
  const visibleBranches = canAccessAllBranches(session.role)
    ? branches
    : branches.filter((branch) => branch.id === session.branchId)

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      select: {
        id: true, reference: true, stage: true, valuationType: true,
        isOverdue: true, dueDate: true, createdAt: true,
        client: { select: { id: true, name: true, type: true } },
        property: { select: { id: true, address: true, localGovernment: true, state: true } },
        assignedValuer: { select: { id: true, firstName: true, lastName: true } },
      },
      skip,
      take: pageSize,
      orderBy: [{ isOverdue: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.case.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header user={user} title="Cases" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Workflow Board
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Track case progress, overdue risk, and assignment across the pipeline.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Search by reference and client, then narrow the pipeline by stage, assignment, and branch without losing the calmer shell language.
              </p>
            </div>
            <CreateCaseModalTrigger
              clients={clients}
              properties={properties}
              valuers={valuers}
              branches={visibleBranches}
            />
          </div>
        </section>

        <Suspense>
          <CasesFilters
            branches={visibleBranches}
            search={search}
            stage={stage}
            isOverdue={Boolean(isOverdue)}
            assignedToMe={assignedToMe}
            branchId={scopedBranchId ?? undefined}
            canAccessAllBranches={canAccessAllBranches(session.role)}
          />
        </Suspense>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <CasesTable cases={cases as any} />

        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
          </Suspense>
        )}
      </div>
    </>
  )
}
