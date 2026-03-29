import { FolderOpen, Clock, CheckCircle, AlertTriangle, type LucideIcon } from 'lucide-react'
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
  color: string
  bg: string
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
      color: 'text-brand-700',
      bg: 'bg-brand-50',
    },
    {
      label: 'Pending Review',
      value: pendingReview,
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    {
      label: 'Completed',
      value: completedCases,
      icon: CheckCircle,
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: AlertTriangle,
      color: 'text-red-700',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <span className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </span>
            </div>
            <p className={`mt-3 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        )
      })}
      <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-4">
        <p className="text-sm font-medium text-gray-500 mb-1">Total Clients</p>
        <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
      </div>
    </div>
  )
}
