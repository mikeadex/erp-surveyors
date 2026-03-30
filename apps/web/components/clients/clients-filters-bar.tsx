'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Filter, SlidersHorizontal } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'

interface BranchOption {
  id: string
  name: string
}

interface ClientsFiltersBarProps {
  search: string | undefined
  type: string | undefined
  status: string
  tag: string | undefined
  branchId: string | undefined
  branchState: string | undefined
  canAccessAllBranches: boolean
  branches: BranchOption[]
}

export function ClientsFiltersBar({
  search,
  type,
  status,
  tag,
  branchId,
  branchState,
  canAccessAllBranches,
  branches,
}: ClientsFiltersBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    return [search, type, tag, status !== 'active' ? status : '', branchState].filter(Boolean).length
  }, [branchState, search, status, tag, type])

  const resetHref = useMemo(() => {
    const params = new URLSearchParams()
    if (branchId) {
      params.set('branchId', branchId)
    }
    if (branchState) {
      params.set('branchState', branchState)
    }
    return params.size > 0 ? `/clients?${params.toString()}` : '/clients'
  }, [branchId, branchState])

  const hasFilters = Boolean(search || type || tag || status !== 'active')

  const formBody = (
    <>
      {!canAccessAllBranches && branchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
      {branchState ? <input type="hidden" name="branchState" value={branchState} /> : null}
      <input
        type="search"
        placeholder="Search name, email, phone, RC number, address, notes, tags, or branch…"
        className="field-shell w-full rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
        name="search"
        defaultValue={search}
      />
      <select
        className="field-shell rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
        name="type"
        defaultValue={type ?? ''}
      >
        <option value="">All types</option>
        <option value="individual">Individual</option>
        <option value="corporate">Corporate</option>
      </select>
      <select
        className="field-shell rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
        name="status"
        defaultValue={status}
      >
        <option value="active">Active</option>
        <option value="archived">Archived</option>
        <option value="all">All</option>
      </select>
      <input
        type="search"
        placeholder="Tag…"
        className="field-shell w-full rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
        name="tag"
        defaultValue={tag}
      />
      {canAccessAllBranches ? (
        <select
          className="field-shell rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
          name="branchId"
          defaultValue={branchId ?? ''}
        >
          <option value="">All client branches</option>
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
        <form className="surface-card grid gap-3 rounded-[28px] p-4 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.75fr))_minmax(0,0.9fr)_auto_auto]" method="GET">
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
                {activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}` : 'Open filters when needed'}
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
          title="Filter Clients"
          description="Narrow the CRM list without taking over the page."
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
