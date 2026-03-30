import { FolderOpen, Clock, CheckCircle, AlertTriangle, TrendingUp, type LucideIcon } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'

interface SummaryCardsProps {
  stageMap: Record<string, number>
  firmId: string
  branchId?: string
}

interface StatCard {
  label: string
  value: number
  icon: LucideIcon
  tone: string
  footnote: string
}

export async function DashboardSummaryCards({ stageMap, firmId, branchId }: SummaryCardsProps) {
  const [overdueCount, totalClients] = await Promise.all([
    prisma.case.count({ where: { firmId, ...(branchId ? { branchId } : {}), isOverdue: true } }),
    prisma.client.count({
      where: branchId
        ? { firmId, deletedAt: null, branchId }
        : { firmId, deletedAt: null },
    }),
  ])

  const activeStages = [
    'case_opened', 'inspection_scheduled', 'inspection_completed',
    'comparable_analysis', 'draft_report', 'review',
  ]
  const activeCases = activeStages.reduce((sum, s) => sum + (stageMap[s] ?? 0), 0)
  const completedCases = (stageMap['final_issued'] ?? 0) + (stageMap['payment_received'] ?? 0)
  const pendingReview = stageMap['review'] ?? 0

  const cards: StatCard[] = [
    {
      label: 'Active Cases',
      value: activeCases,
      icon: FolderOpen,
      tone: 'text-brand-700',
      footnote: 'Open instructions moving through the pipeline',
    },
    {
      label: 'Pending Review',
      value: pendingReview,
      icon: Clock,
      tone: 'text-slate-900',
      footnote: 'Files waiting for reviewer sign-off',
    },
    {
      label: 'Completed',
      value: completedCases,
      icon: CheckCircle,
      tone: 'text-slate-900',
      footnote: 'Reports issued and payment milestones reached',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: AlertTriangle,
      tone: 'text-slate-900',
      footnote: 'Interventions needed to protect turnaround time',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="surface-card relative overflow-hidden rounded-[28px] p-5"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-brand-500/75" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className={`mt-3 text-3xl font-semibold tracking-tight ${card.tone}`}>{card.value}</p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
                <TrendingUp className="h-3.5 w-3.5 text-brand-600" />
                Live
              </span>
              <span>{card.footnote}</span>
            </div>
          </div>
        )
      })}
      <div className="surface-card col-span-2 rounded-[30px] p-6 lg:col-span-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Client Portfolio</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{totalClients}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Active relationships currently available for case intake, branch operations, and reporting.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Active</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{activeCases}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Review</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{pendingReview}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Done</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{completedCases}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">At Risk</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
