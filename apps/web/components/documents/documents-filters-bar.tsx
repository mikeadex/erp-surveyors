'use client'

import Link from 'next/link'
import { Filter, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'

interface DocumentsFiltersBarProps {
  search: string | undefined
  caseId: string | undefined
}

export function DocumentsFiltersBar({
  search,
  caseId,
}: DocumentsFiltersBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    return [search, caseId].filter(Boolean).length
  }, [caseId, search])

  const resetHref = useMemo(() => {
    const params = new URLSearchParams()
    if (caseId) {
      params.set('caseId', caseId)
    }
    return params.size > 0 ? `/documents?${params.toString()}` : '/documents'
  }, [caseId])

  const hasFilters = Boolean(search)

  const formBody = (
    <>
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      <input
        type="search"
        name="search"
        defaultValue={search}
        placeholder="Search document name…"
        className="field-shell w-full rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
      />
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
          className="surface-card grid gap-3 rounded-[28px] p-4 xl:grid-cols-[minmax(0,1.5fr)_auto_auto]"
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
                  : 'Search the document register when needed'}
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
          title="Filter Documents"
          description="Search the document register without taking over the page."
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
