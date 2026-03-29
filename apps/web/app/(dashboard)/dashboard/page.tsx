import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { verifyAccessToken } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { BranchFilter } from '@/components/ui/branch-filter'
import { Header } from '@/components/layout/header'
import { DashboardSummaryCards } from '@/components/dashboard/summary-cards'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  let session
  try {
    session = await verifyAccessToken(token)
  } catch {
    redirect('/login')
  }
  const params = await searchParams
  const scopedBranchId = await resolveScopedBranchId(session, params.branchId ?? null)

  const [user, caseCounts, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, role: true },
    }),
    prisma.case.groupBy({
      by: ['stage'],
      where: { firmId: session.firmId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      _count: { id: true },
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

  const stageMap = Object.fromEntries(
    caseCounts.map((r: { stage: string; _count: { id: number } }) => [r.stage, r._count.id]),
  )

  return (
    <>
      <Header user={user} title="Dashboard" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-end">
          <BranchFilter branches={visibleBranches} />
        </div>
        <DashboardSummaryCards
          stageMap={stageMap}
          firmId={session.firmId}
          {...(scopedBranchId ? { branchId: scopedBranchId } : {})}
        />
      </div>
    </>
  )
}
