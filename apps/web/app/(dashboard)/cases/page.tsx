import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Suspense>
            <CasesFilters branches={visibleBranches} />
          </Suspense>
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Case
          </Link>
        </div>

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
