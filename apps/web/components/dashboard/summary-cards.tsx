import { AlertTriangle, CheckCircle, Clock, Coins, FolderOpen, Receipt, TrendingUp, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '@valuation-os/utils'
import type { UserRole } from '@valuation-os/types'

interface SummaryCardsProps {
  role: UserRole
  summary: Record<string, any>
  stageMap: Record<string, number>
}

interface StatCard {
  label: string
  value: string | number
  icon: LucideIcon
  tone: string
  footnote: string
}

function buildCards(role: UserRole, summary: Record<string, any>, stageMap: Record<string, number>): StatCard[] {
  if (role === 'finance') {
    return [
      {
        label: 'Unpaid Invoices',
        value: formatCurrency(summary.unpaidInvoices ?? 0),
        icon: Receipt,
        tone: 'text-brand-700',
        footnote: 'Outstanding billed value still awaiting settlement',
      },
      {
        label: 'Paid This Month',
        value: formatCurrency(summary.paidThisMonth ?? 0),
        icon: Coins,
        tone: 'text-slate-900',
        footnote: 'Collections recorded since the start of the month',
      },
      {
        label: 'Overdue Invoices',
        value: summary.invoicesOverdue ?? 0,
        icon: AlertTriangle,
        tone: 'text-slate-900',
        footnote: 'Records that need direct finance follow-up',
      },
      {
        label: 'Outstanding Count',
        value: summary.outstandingCount ?? 0,
        icon: Clock,
        tone: 'text-slate-900',
        footnote: 'Draft-free live receivables still in motion',
      },
    ]
  }

  if (role === 'valuer' || role === 'field_officer') {
    return [
      {
        label: 'Assigned To Me',
        value: summary.assignedToMe ?? 0,
        icon: FolderOpen,
        tone: 'text-brand-700',
        footnote: 'Open files currently sitting in your delivery queue',
      },
      {
        label: 'Inspections Due',
        value: summary.inspectionsDue ?? 0,
        icon: Clock,
        tone: 'text-slate-900',
        footnote: 'Cases waiting on inspection work or follow-through',
      },
      {
        label: 'Draft Report',
        value: stageMap.draft_report ?? 0,
        icon: CheckCircle,
        tone: 'text-slate-900',
        footnote: 'Files that are close to reviewer handoff',
      },
      {
        label: 'Overdue Assigned',
        value: summary.overdueAssigned ?? 0,
        icon: AlertTriangle,
        tone: 'text-slate-900',
        footnote: 'Assignments that need intervention to protect turnaround',
      },
    ]
  }

  return [
    {
      label: 'Open Cases',
      value: summary.openCases ?? 0,
      icon: FolderOpen,
      tone: 'text-brand-700',
      footnote: 'Instructions currently active across the operating pipeline',
    },
    {
      label: 'Review Load',
      value: stageMap.review ?? 0,
      icon: Clock,
      tone: 'text-slate-900',
      footnote: 'Drafts currently waiting for reviewer sign-off',
    },
    {
      label: 'Library Size',
      value: summary.comparableCount ?? 0,
      icon: CheckCircle,
      tone: 'text-slate-900',
      footnote: 'Comparable evidence already available to the firm',
    },
    {
      label: 'Revenue Pipeline',
      value: formatCurrency(summary.revenuePipeline ?? 0),
      icon: Coins,
      tone: 'text-slate-900',
      footnote: 'Unpaid invoice value still working through collection',
    },
  ]
}

export function DashboardSummaryCards({ role, summary, stageMap }: SummaryCardsProps) {
  if (role === 'finance') {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="surface-card relative overflow-hidden rounded-[30px] bg-brand-700 p-6 text-white">
            <div className="absolute inset-x-0 top-0 h-1 bg-white/35" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  Income Snapshot
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight">
                  {formatCurrency(summary.paidThisMonth ?? 0)}
                </p>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/80">
                  Cash collected this month across issued invoices and completed receipts.
                </p>
              </div>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-white">
                <Coins className="h-6 w-6" />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[22px] bg-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">YTD Income</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {formatCurrency(summary.paidThisYear ?? 0)}
                </p>
              </div>
              <div className="rounded-[22px] bg-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Projection</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {formatCurrency(summary.projectedReceipts ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="surface-card rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Receipts</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-brand-700">
                  {formatCurrency(summary.unpaidInvoices ?? 0)}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Receipt className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-5 text-xs text-slate-500">
              Live receivables still expected to convert into collections.
            </p>
          </div>

          <div className="surface-card rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue Pressure</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                  {summary.invoicesOverdue ?? 0}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-rose-700">
              {formatCurrency(summary.overdueAmount ?? 0)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Invoices that need immediate follow-up before slippage worsens.
            </p>
          </div>
        </div>

        <div className="surface-card rounded-[30px] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Finance Snapshot</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(summary.unpaidInvoices ?? 0)}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Outstanding billed value currently in the receivables queue, with projected month-end recovery shown above.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Income', value: formatCurrency(summary.paidThisMonth ?? 0) },
                { label: 'Pending', value: formatCurrency(summary.unpaidInvoices ?? 0) },
                { label: 'Projection', value: formatCurrency(summary.projectedReceipts ?? 0) },
                { label: 'Open', value: summary.outstandingCount ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const cards = buildCards(role, summary, stageMap)

  const bottomTitle =
    role === 'valuer' || role === 'field_officer'
      ? 'My Delivery Mix'
      : 'Operations Snapshot'

  const bottomValue =
    role === 'valuer' || role === 'field_officer'
      ? summary.assignedToMe ?? 0
      : summary.openCases ?? 0

  const bottomCopy =
    role === 'valuer' || role === 'field_officer'
      ? 'Open instructions currently owned by you across inspection, analysis, and reporting.'
      : 'Active work currently visible across branches, review, and delivery.'

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
            <p className="text-sm font-medium text-slate-500">{bottomTitle}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{bottomValue}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{bottomCopy}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(role === 'valuer' || role === 'field_officer'
                ? [
                    { label: 'Inspection', value: stageMap.inspection_scheduled ?? 0 },
                    { label: 'Analysis', value: stageMap.comparable_analysis ?? 0 },
                    { label: 'Draft', value: stageMap.draft_report ?? 0 },
                    { label: 'Review', value: stageMap.review ?? 0 },
                  ]
                : [
                    { label: 'Open', value: summary.openCases ?? 0 },
                    { label: 'Review', value: stageMap.review ?? 0 },
                    { label: 'Overdue', value: summary.overdueCases ?? 0 },
                    { label: 'Avg Days', value: Number(summary.avgTurnaroundDays ?? 0).toFixed(1) },
                  ]).map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
