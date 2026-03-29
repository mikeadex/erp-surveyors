'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit3, Loader2 } from 'lucide-react'
import type { CreateClientInput } from '@valuation-os/utils'
import { ModalShell } from '@/components/ui/modal-shell'

interface BranchOption {
  id: string
  name: string
}

interface ClientManagementPanelProps {
  clientId: string
  initial: {
    branchId: string | null
    branchName?: string | null
    type: 'individual' | 'corporate'
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    rcNumber: string | null
    notes: string | null
    tags: string[]
    deletedAt: string | null
  }
  branches: BranchOption[]
  canSelectBranch: boolean
  canArchive: boolean
  mode?: 'panel' | 'trigger'
  buttonClassName?: string
}

export function ClientManagementPanel({
  clientId,
  initial,
  branches,
  canSelectBranch,
  canArchive,
  mode = 'panel',
  buttonClassName,
}: ClientManagementPanelProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    branchId: initial.branchId ?? '',
    type: initial.type,
    name: initial.name,
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    address: initial.address ?? '',
    city: initial.city ?? '',
    state: initial.state ?? '',
    rcNumber: initial.rcNumber ?? '',
    notes: initial.notes ?? '',
    tags: initial.tags.join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{
    id: string
    name: string
    score: number
    email: string | null
    phone: string | null
    rcNumber: string | null
  }>>([])

  function resetForm() {
    setForm({
      branchId: initial.branchId ?? '',
      type: initial.type,
      name: initial.name,
      email: initial.email ?? '',
      phone: initial.phone ?? '',
      address: initial.address ?? '',
      city: initial.city ?? '',
      state: initial.state ?? '',
      rcNumber: initial.rcNumber ?? '',
      notes: initial.notes ?? '',
      tags: initial.tags.join(', '),
    })
    setError(null)
    setNotice(null)
    setDuplicateWarnings([])
  }

  async function save() {
    setSaving(true)
    setError(null)

    const payload: Partial<CreateClientInput> = {
      branchId: form.branchId || undefined,
      type: form.type,
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      rcNumber: form.rcNumber || undefined,
      notes: form.notes || undefined,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    }

    const res = await fetch(`/api/v1/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to update client')
      return
    }

    const matches = json?.data?.duplicateMatches ?? []
    if (matches.length > 0) {
      setDuplicateWarnings(matches)
      setNotice('Changes saved. Review the similar client records below before leaving.')
      router.refresh()
      return
    }

    setNotice(null)
    setDuplicateWarnings([])
    setOpen(false)
    router.refresh()
  }

  async function toggleArchived() {
    setActing(true)
    setError(null)
    const res = await fetch(
      initial.deletedAt ? `/api/v1/clients/${clientId}/restore` : `/api/v1/clients/${clientId}`,
      { method: initial.deletedAt ? 'POST' : 'DELETE' },
    )
    setActing(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Action failed')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      {mode === 'panel' ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Manage Client</h2>
              <p className="mt-1 text-xs text-gray-500">
                Edit relationship details in a modal instead of inline on the page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Edit3 className="h-4 w-4" />
              Edit Client
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-gray-500">Branch</dt>
              <dd className="mt-1 font-medium text-gray-900">{initial.branchName ?? 'Unassigned'}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-gray-500">Type</dt>
              <dd className="mt-1 font-medium capitalize text-gray-900">{initial.type}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-gray-500">Email</dt>
              <dd className="mt-1 font-medium text-gray-900">{initial.email ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-gray-500">Phone</dt>
              <dd className="mt-1 font-medium text-gray-900">{initial.phone ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-gray-500">Tags</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {initial.tags.length > 0 ? initial.tags.join(', ') : 'No tags'}
              </dd>
            </div>
            {initial.deletedAt && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-amber-700">Status</dt>
                <dd className="mt-1 font-medium text-amber-900">Archived</dd>
              </div>
            )}
          </dl>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => {
            resetForm()
            setOpen(true)
          }}
          className={buttonClassName ?? 'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'}
        >
          <Edit3 className="h-4 w-4" />
          Edit Client
        </button>
      )}

      {open && (
        <ModalShell
          title="Edit Client"
          description="Update ownership and relationship details for this client."
          onClose={() => {
            setOpen(false)
            resetForm()
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Branch</label>
                <select
                  value={form.branchId}
                  onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                  disabled={!canSelectBranch}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Select branch…</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Client Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
                <select
                  value={form.type}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    type: event.target.value as 'individual' | 'corporate',
                  }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="individual">Individual</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">RC Number</label>
                <input
                  value={form.rcNumber}
                  onChange={(event) => setForm((current) => ({ ...current, rcNumber: event.target.value }))}
                  disabled={form.type !== 'corporate'}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
                <input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Phone</label>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Address</label>
                <input
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
                <input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">State</label>
                <input
                  value={form.state}
                  onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Tags</label>
                <input
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="bank, repeat-client, priority"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Relationship Notes</label>
                <textarea
                  rows={5}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Capture relationship context, internal handling notes, or service preferences."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            {notice && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>}

            <div className="flex items-center justify-between gap-3 pt-2">
              {canArchive ? (
                <button
                  type="button"
                  onClick={toggleArchived}
                  disabled={acting}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                    initial.deletedAt
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  } disabled:opacity-60`}
                >
                  {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {initial.deletedAt ? 'Restore Client' : 'Archive Client'}
                </button>
              ) : <span />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    resetForm()
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>

            {duplicateWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-900">Similar client records</h3>
                <ul className="mt-3 space-y-2 text-sm text-amber-900">
                  {duplicateWarnings.map((match) => (
                    <li key={match.id} className="rounded-lg bg-white/80 px-3 py-2">
                      <div className="font-medium">{match.name}</div>
                      <div className="text-xs text-amber-700">
                        Match score {match.score}
                        {match.email ? ` • ${match.email}` : ''}
                        {match.phone ? ` • ${match.phone}` : ''}
                        {match.rcNumber ? ` • ${match.rcNumber}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </>
  )
}
