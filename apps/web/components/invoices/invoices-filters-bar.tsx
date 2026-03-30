'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Filter, SlidersHorizontal } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'

interface InvoicesFiltersBarProps {
  search: string | undefined
  status: string | undefined
  branchId: string | undefined
}

export function InvoicesFiltersBar({
  search,
  status,
  branchId,
}: InvoicesFiltersBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    return [search].filter(Boolean).length
  }, [search])

  const resetHref = useMemo(() => {
    const params = new URLSearchParams()
    if (status) {
      params.set('status', status)
    }
    if (branchId) {
      params.set('branchId', branchId)
    }
    return params.size > 0 ? `/invoices?${params.toString()}` : '/invoices'
  }, [branchId, status])

  const hasFilters = Boolean(search)

  const formBody = (
    <>
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {branchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
      <input
        type="search"
        name="search"
        defaultValue={search}
        placeholder="Search invoice number, client, or case reference…"
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
                  ? `${activeFilterCount} active filter`
                  : 'Search the invoice register when needed'}
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
          title="Filter Invoices"
          description="Search the invoice register without taking over the page."
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
