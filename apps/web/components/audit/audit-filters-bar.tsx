'use client'

import Link from 'next/link'
import { Filter, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'

interface UserOption {
  id: string
  firstName: string
  lastName: string
}

interface AuditFiltersBarProps {
  entityType: string | undefined
  entityId: string | undefined
  userId: string | undefined
  users: UserOption[]
}

export function AuditFiltersBar({
  entityType,
  entityId,
  userId,
  users,
}: AuditFiltersBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    return [entityType, entityId, userId].filter(Boolean).length
  }, [entityId, entityType, userId])

  const hasFilters = Boolean(entityType || entityId || userId)

  const formBody = (
    <>
      <input
        type="search"
        name="entityType"
        defaultValue={entityType}
        placeholder="Filter entity type…"
        className="field-shell w-full rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
      />
      <select
        name="userId"
        defaultValue={userId ?? ''}
        className="field-shell rounded-2xl px-3.5 py-3 text-sm text-slate-700 outline-none"
      >
        <option value="">All users</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.firstName} {user.lastName}
          </option>
        ))}
      </select>
      <input
        type="search"
        name="entityId"
        defaultValue={entityId}
        placeholder="Filter entity ID…"
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
          href="/audit"
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
          method="GET"
          className="surface-card grid gap-3 rounded-[28px] p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto]"
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
                  : 'Narrow audit activity when needed'}
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
          title="Filter Audit Log"
          description="Narrow audit activity without taking over the page."
          onClose={() => setMobileOpen(false)}
          widthClassName="max-w-lg"
        >
          <form method="GET" className="grid gap-3">
            {formBody}
          </form>
        </ModalShell>
      ) : null}
    </>
  )
}
