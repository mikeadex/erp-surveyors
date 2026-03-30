'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquarePlus } from 'lucide-react'

interface CaseNotesPanelProps {
  caseId: string
  initialNotes: string | null
}

function parseNoteEntries(value: string | null) {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(.+?)\]\s*(.*)$/)
      if (!match) {
        return { label: null, body: line }
      }

      const parsedDate = new Date(match[1])
      return {
        label: Number.isNaN(parsedDate.getTime()) ? match[1] : parsedDate.toLocaleString('en-GB'),
        body: match[2],
      }
    })
    .reverse()
}

export function CaseNotesPanel({ caseId, initialNotes }: CaseNotesPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const entries = useMemo(() => parseNoteEntries(initialNotes), [initialNotes])

  async function submitNote() {
    if (!note.trim()) return
    setError(null)

    const res = await fetch(`/api/v1/cases/${caseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note.trim() }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to save note')
      return
    }

    setNote('')
    startTransition(() => router.refresh())
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Internal Notes</h2>
      </div>

      <div className="space-y-3">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          placeholder="Add a case note for your team…"
          className="block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex items-center justify-between gap-3">
          {error ? <p className="text-xs text-red-600">{error}</p> : <span />}
          <button
            type="button"
            onClick={submitNote}
            disabled={isPending || note.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Note
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400">
            No internal notes yet.
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={`${entry.label ?? 'note'}-${index}`} className="rounded-[22px] bg-slate-50/80 px-4 py-3">
              {entry.label ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {entry.label}
                </p>
              ) : null}
              <p className="mt-1 text-sm leading-6 text-slate-700">{entry.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
