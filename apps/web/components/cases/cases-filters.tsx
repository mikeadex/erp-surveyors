'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { STAGE_ORDER } from '@valuation-os/utils'
import { getCaseStageLabel } from '@valuation-os/utils'
import { BranchFilter } from '@/components/ui/branch-filter'

interface BranchOption {
  id: string
  name: string
}

export function CasesFilters({ branches }: { branches: BranchOption[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Search reference or client…"
        defaultValue={searchParams.get('search') ?? ''}
        onChange={(e) => setParam('search', e.target.value || null)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
      />

      <select
        defaultValue={searchParams.get('stage') ?? ''}
        onChange={(e) => setParam('stage', e.target.value || null)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All stages</option>
        {STAGE_ORDER.map((s) => (
          <option key={s} value={s}>
            {getCaseStageLabel(s)}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={searchParams.get('isOverdue') === 'true'}
          onChange={(e) => setParam('isOverdue', e.target.checked ? 'true' : null)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Overdue only
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={searchParams.get('assignedToMe') === 'true'}
          onChange={(e) => setParam('assignedToMe', e.target.checked ? 'true' : null)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Assigned to me
      </label>

      <BranchFilter branches={branches} />
    </div>
  )
}
