'use client'

import Link from 'next/link'
import { formatDate } from '@valuation-os/utils'
import { StageBadge } from './stage-badge'
import { AlertTriangle, BriefcaseBusiness, CalendarClock, MapPin, UserRound } from 'lucide-react'
import type { CaseStage } from '@valuation-os/types'

export interface CaseRow {
  id: string
  reference: string
  stage: CaseStage
  valuationType: string
  isOverdue: boolean
  dueDate: string | null
  createdAt: string
  client: { id: string; name: string; type: string }
  property: { id: string; address: string; localGovernment: string | null; state: string } | null
  assignedValuer: { id: string; firstName: string; lastName: string } | null
}

interface CasesTableProps {
  cases: CaseRow[]
}

export function CasesTable({ cases }: CasesTableProps) {
  if (cases.length === 0) {
    return (
      <div className="surface-card rounded-[28px] p-12 text-center">
        <p className="text-sm text-slate-500">No cases found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 xl:hidden">
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/cases/${c.id}`}
            className="surface-card block rounded-[28px] p-4 transition-colors hover:bg-slate-50/70 sm:p-5"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex shrink-0 rounded-2xl bg-slate-100 p-2.5">
                  <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {c.isOverdue ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                        ) : null}
                        <p className="font-mono text-lg font-semibold leading-8 text-slate-900">
                          {c.reference}
                        </p>
                      </div>
                      <p className="mt-0.5 text-sm capitalize text-slate-400">
                        {c.valuationType.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <StageBadge stage={c.stage} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Client
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{c.client.name}</p>
                  <p className="mt-1 text-xs capitalize text-slate-400">{c.client.type}</p>
                </div>

                <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Valuer
                  </p>
                  <div className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-700">
                    <UserRound className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                    <span>
                      {c.assignedValuer
                        ? `${c.assignedValuer.firstName} ${c.assignedValuer.lastName}`
                        : 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Property
                </p>
                <div className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                  <span>
                    {c.property?.address ?? 'No property linked'}
                    {c.property ? (
                      <span className="mt-1 block text-xs text-slate-400">
                        {[c.property.localGovernment, c.property.state].filter(Boolean).join(', ')}
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Due
                </p>
                <div className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <CalendarClock className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                  <span className={c.isOverdue ? 'font-medium text-rose-700' : ''}>
                    {c.dueDate ? formatDate(c.dueDate) : 'No due date'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Created {formatDate(c.createdAt)}</p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
                <span className="text-slate-400">Open case record</span>
                <span className="font-medium text-brand-700">View case</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80">
            <tr>
              {['Reference', 'Client', 'Property', 'Stage', 'Valuer', 'Due', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {cases.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    {c.isOverdue && (
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-rose-600" />
                    )}
                    <span className="font-mono text-sm font-semibold text-slate-900">{c.reference}</span>
                  </div>
                  <span className="text-xs capitalize text-slate-400">
                    {c.valuationType.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-semibold text-slate-900">{c.client.name}</span>
                  <br />
                  <span className="text-xs capitalize text-slate-400">{c.client.type}</span>
                </td>
                <td className="max-w-[220px] px-4 py-4">
                  <span className="line-clamp-1 text-sm text-slate-700">{c.property?.address ?? '—'}</span>
                  <span className="text-xs text-slate-400">
                    {c.property ? `${c.property.localGovernment ?? ''} ${c.property.state}`.trim() : ''}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <StageBadge stage={c.stage} />
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                  {c.assignedValuer
                    ? `${c.assignedValuer.firstName} ${c.assignedValuer.lastName}`
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                  {c.dueDate ? (
                    <span className={c.isOverdue ? 'font-medium text-rose-700' : ''}>
                      {formatDate(c.dueDate)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                  <Link
                    href={`/cases/${c.id}`}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
