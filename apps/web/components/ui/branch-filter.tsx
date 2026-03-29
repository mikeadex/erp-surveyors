'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface BranchOption {
  id: string
  name: string
}

interface BranchFilterProps {
  branches: BranchOption[]
  queryKey?: string
  label?: string
  allLabel?: string
}

export function BranchFilter({
  branches,
  queryKey = 'branchId',
  label = 'Branch',
  allLabel = 'All branches',
}: BranchFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setBranch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(queryKey, value)
      } else {
        params.delete(queryKey)
      }
      params.delete('page')
      router.push(params.toString() ? `?${params.toString()}` : '?')
    },
    [queryKey, router, searchParams],
  )

  if (branches.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={queryKey} className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <select
        id={queryKey}
        value={searchParams.get(queryKey) ?? ''}
        onChange={(e) => setBranch(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">{allLabel}</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  )
}
