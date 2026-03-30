'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare2, Loader2, Plus, Trash2 } from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  isChecked: boolean
  checkedAt: string | Date | null
}

interface CaseChecklistPanelProps {
  caseId: string
  items: ChecklistItem[]
}

export function CaseChecklistPanel({ caseId, items }: CaseChecklistPanelProps) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function refreshAfter() {
    startTransition(() => router.refresh())
  }

  async function addItem() {
    if (!label.trim()) return
    setError(null)
    const res = await fetch(`/api/v1/cases/${caseId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim() }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to add checklist item')
      return
    }
    setLabel('')
    await refreshAfter()
  }

  async function toggleItem(item: ChecklistItem) {
    setBusyItemId(item.id)
    setError(null)
    const res = await fetch(`/api/v1/cases/${caseId}/checklist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isChecked: !item.isChecked }),
    })
    const json = await res.json().catch(() => ({}))
    setBusyItemId(null)
    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to update checklist item')
      return
    }
    await refreshAfter()
  }

  async function deleteItem(itemId: string) {
    setBusyItemId(itemId)
    setError(null)
    const res = await fetch(`/api/v1/cases/${caseId}/checklist/${itemId}`, {
      method: 'DELETE',
    })
    const json = await res.json().catch(() => ({}))
    setBusyItemId(null)
    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to delete checklist item')
      return
    }
    await refreshAfter()
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare2 className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Checklist</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Add a checklist item…"
          className="block flex-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={isPending || label.trim().length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Item
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400">
            No checklist items yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-[22px] bg-slate-50/80 px-4 py-3"
            >
              <label className="flex min-w-0 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.isChecked}
                  onChange={() => toggleItem(item)}
                  disabled={busyItemId === item.id}
                  className="mt-1 rounded border-slate-300 text-brand-600"
                />
                <span className="min-w-0">
                  <span className={`block text-sm ${item.isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                  {item.checkedAt ? (
                    <span className="mt-1 block text-xs text-slate-400">
                      Checked {new Date(item.checkedAt).toLocaleString('en-GB')}
                    </span>
                  ) : null}
                </span>
              </label>
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                disabled={busyItemId === item.id}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-red-600"
                aria-label="Delete checklist item"
              >
                {busyItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
