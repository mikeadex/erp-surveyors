'use client'

import Link from 'next/link'
import { ClipboardCheck, Filter, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'

interface BranchOption {
  id: string
  name: string
}

interface InspectionsFiltersBarProps {
  status: string | undefined
  branchId: string | undefined
  branches: BranchOption[]
  canAccessAllBranches: boolean
}

export function InspectionsFiltersBar({
  status,
  branchId,
  branches,
  canAccessAllBranches,
}: InspectionsFiltersBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    return [
      status && status !== 'all' ? status : '',
      canAccessAllBranches && branchId ? branchId : '',
    ].filter(Boolean).length
  }, [branchId, canAccessAllBranches, status])

  const resetHref = useMemo(() => {
    const params = new URLSearchParams()
    if (!canAccessAllBranches && branchId) {
      params.set('branchId', branchId)
    }
    return params.size > 0 ? `/inspections?${params.toString()}` : '/inspections'
  }, [branchId, canAccessAllBranches])

  const hasFilters = Boolean((status && status !== 'all') || (canAccessAllBranches && branchId))

  const formBody = (
    <>
      {!canAccessAllBranches && branchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
      <select
        className="field-shell rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
        name="status"
        defaultValue={status ?? ''}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="submitted">Submitted</option>
      </select>
      {canAccessAllBranches ? (
        <select
          className="field-shell rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
          name="branchId"
          defaultValue={branchId ?? ''}
        >
          <option value="">All inspection branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="submit"
        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      >
        Apply
      </button>
      {hasFilters ? (
        <Link
          href={resetHref}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Reset
        </Link>
      ) : null}
    </>
  )

  return (
    <>
      <div className="hidden xl:block">
        <form
          className={`surface-card grid gap-3 rounded-[28px] p-4 ${
            canAccessAllBranches
              ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]'
              : 'xl:grid-cols-[minmax(0,1fr)_auto_auto]'
          }`}
          method="GET"
        >
          {formBody}
        </form>
      </div>

      <div className="xl:hidden">
        <div className="surface-card flex items-center justify-between gap-3 rounded-[24px] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Filter className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Filters</p>
              <p className="text-xs text-slate-500">
                {activeFilterCount > 0
                  ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                  : 'Narrow the inspections board when needed'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <ModalShell
          title="Filter Inspections"
          description="Narrow the inspections board without taking over the page."
          onClose={() => setMobileOpen(false)}
          widthClassName="max-w-lg"
        >
          <form className="grid gap-3" method="GET">
            {formBody}
          </form>
        </ModalShell>
      ) : null}
    </>
  )
}
