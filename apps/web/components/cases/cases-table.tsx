'use client'

import Link from 'next/link'
import { formatDate } from '@valuation-os/utils'
import { StageBadge } from './stage-badge'
import { AlertTriangle } from 'lucide-react'
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
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">No cases found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Reference', 'Client', 'Property', 'Stage', 'Valuer', 'Due', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {c.isOverdue && (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  )}
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {c.reference}
                  </span>
                </div>
                <span className="text-xs text-gray-400 capitalize">
                  {c.valuationType.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm font-medium text-gray-900">{c.client.name}</span>
                <br />
                <span className="text-xs text-gray-400 capitalize">{c.client.type}</span>
              </td>
              <td className="px-4 py-3 max-w-[200px]">
                <span className="text-sm text-gray-700 line-clamp-1">
                  {c.property?.address ?? '—'}
                </span>
                <span className="text-xs text-gray-400">
                  {c.property ? `${c.property.localGovernment ?? ''} ${c.property.state}`.trim() : ''}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StageBadge stage={c.stage} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {c.assignedValuer
                  ? `${c.assignedValuer.firstName} ${c.assignedValuer.lastName}`
                  : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {c.dueDate ? (
                  <span className={c.isOverdue ? 'text-red-600 font-medium' : ''}>
                    {formatDate(c.dueDate)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link
                  href={`/cases/${c.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
