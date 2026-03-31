import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { verifyAccessToken } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { BranchFilter } from '@/components/ui/branch-filter'
import { Header } from '@/components/layout/header'
import { DashboardSummaryCards } from '@/components/dashboard/summary-cards'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { getDashboardStageItems, getDashboardSummary } from '@/lib/dashboard/metrics'

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

  const [user, summary, stageItems, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, role: true },
    }),
    getDashboardSummary(session, scopedBranchId),
    getDashboardStageItems(session, scopedBranchId),
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
    stageItems.map((r) => [r.stage, r.count]),
  )

  return (
    <>
      <Header user={user} title="Dashboard" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {session.role === 'finance' ? 'Finance Command' : 'Command Centre'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {session.role === 'finance'
                  ? 'Track collections, pending receipts, and month-end recovery with clarity.'
                  : 'Keep valuations, branch work, and delivery risk in view.'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {session.role === 'finance'
                  ? 'The finance workspace now surfaces income, projection, pending receivables, and overdue pressure more prominently.'
                  : 'The workspace now uses a calmer operating shell with a neutral base, a collapsible sidebar, and Nigerian-green accents for the important states.'}
              </p>
            </div>
            <div className="flex items-center justify-start lg:justify-end">
              <BranchFilter branches={visibleBranches} />
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Snapshot
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {session.role === 'finance'
                  ? 'A bolder view of income, projection, pending collections, and overdue pressure.'
                  : 'A quick view of throughput, review load, and overdue pressure.'}
              </p>
            </div>
          </div>
          
          <DashboardSummaryCards
            role={session.role}
            summary={summary}
            stageMap={stageMap}
          />
        </div>
      </div>
    </>
  )
}
