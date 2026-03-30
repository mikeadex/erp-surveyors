'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit3, Loader2 } from 'lucide-react'
import type { CreatePropertyInput } from '@valuation-os/utils'
import { ModalShell } from '@/components/ui/modal-shell'
import { SimpleRichTextEditor } from '@/components/ui/simple-rich-text-editor'

const PROPERTY_USES = ['residential', 'commercial', 'industrial', 'agricultural', 'mixed_use', 'land'] as const
const TENURE_TYPES = [
  'statutory_right_of_occupancy',
  'customary_right_of_occupancy',
  'leasehold',
  'freehold',
  'government_allocation',
  'other',
] as const

function labelOf(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const secondaryButtonClassName =
  'rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50'

interface PropertyManagementPanelProps {
  propertyId: string
  initial: {
    address: string
    city: string
    state: string
    localGovernment: string | null
    propertyUse: CreatePropertyInput['propertyUse']
    tenureType: CreatePropertyInput['tenureType']
    plotSize: number | null
    plotSizeUnit: string | null
    description: string | null
    latitude: number | null
    longitude: number | null
    deletedAt: string | null
  }
  canArchive: boolean
}

export function PropertyManagementPanel({
  propertyId,
  initial,
  canArchive,
}: PropertyManagementPanelProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    address: initial.address,
    city: initial.city,
    state: initial.state,
    localGovernment: initial.localGovernment ?? '',
    propertyUse: initial.propertyUse,
    tenureType: initial.tenureType,
    plotSize: initial.plotSize?.toString() ?? '',
    plotSizeUnit: initial.plotSizeUnit ?? 'sqm',
    description: initial.description ?? '',
    latitude: initial.latitude?.toString() ?? '',
    longitude: initial.longitude?.toString() ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setForm({
      address: initial.address,
      city: initial.city,
      state: initial.state,
      localGovernment: initial.localGovernment ?? '',
      propertyUse: initial.propertyUse,
      tenureType: initial.tenureType,
      plotSize: initial.plotSize?.toString() ?? '',
      plotSizeUnit: initial.plotSizeUnit ?? 'sqm',
      description: initial.description ?? '',
      latitude: initial.latitude?.toString() ?? '',
      longitude: initial.longitude?.toString() ?? '',
    })
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)

    const payload: Partial<CreatePropertyInput> = {
      address: form.address,
      city: form.city,
      state: form.state,
      localGovernment: form.localGovernment || undefined,
      propertyUse: form.propertyUse,
      tenureType: form.tenureType,
      plotSize: form.plotSize ? Number(form.plotSize) : undefined,
      plotSizeUnit: form.plotSize ? form.plotSizeUnit as CreatePropertyInput['plotSizeUnit'] : undefined,
      description: form.description || undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
    }

    const res = await fetch(`/api/v1/properties/${propertyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to update property')
      return
    }

    setOpen(false)
    router.refresh()
  }

  async function toggleArchived() {
    setActing(true)
    setError(null)
    const res = await fetch(
      initial.deletedAt ? `/api/v1/properties/${propertyId}/restore` : `/api/v1/properties/${propertyId}`,
      { method: initial.deletedAt ? 'POST' : 'DELETE' },
    )
    const json = await res.json().catch(() => ({}))
    setActing(false)

    if (!res.ok) {
      setError(json?.error?.message ?? 'Action failed')
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm()
          setOpen(true)
        }}
        className={secondaryButtonClassName}
      >
        <Edit3 className="h-4 w-4" />
        Edit Property
      </button>

      {open && (
        <ModalShell
          title="Edit Property"
          description="Update registry details without leaving this page."
          onClose={() => {
            setOpen(false)
            resetForm()
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClassName}>Address</label>
                <input
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>City</label>
                <input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>State</label>
                <input
                  value={form.state}
                  onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClassName}>Local Government</label>
                <input
                  value={form.localGovernment}
                  onChange={(event) => setForm((current) => ({ ...current, localGovernment: event.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Property Use</label>
                <select
                  value={form.propertyUse}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    propertyUse: event.target.value as CreatePropertyInput['propertyUse'],
                  }))}
                  className={inputClassName}
                >
                  {PROPERTY_USES.map((value) => (
                    <option key={value} value={value}>{labelOf(value)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName}>Tenure Type</label>
                <select
                  value={form.tenureType}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    tenureType: event.target.value as CreatePropertyInput['tenureType'],
                  }))}
                  className={inputClassName}
                >
                  {TENURE_TYPES.map((value) => (
                    <option key={value} value={value}>{labelOf(value)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName}>Plot Size</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.plotSize}
                  onChange={(event) => setForm((current) => ({ ...current, plotSize: event.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Unit</label>
                <select
                  value={form.plotSizeUnit}
                  onChange={(event) => setForm((current) => ({ ...current, plotSizeUnit: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="sqm">sqm</option>
                  <option value="sqft">sqft</option>
                  <option value="hectare">hectare</option>
                  <option value="acres">acres</option>
                </select>
              </div>

              <div>
                <label className={labelClassName}>Latitude</label>
                <input
                  type="number"
                  min={-90}
                  max={90}
                  step={0.0000001}
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Longitude</label>
                <input
                  type="number"
                  min={-180}
                  max={180}
                  step={0.0000001}
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  className={inputClassName}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClassName}>Description</label>
                <SimpleRichTextEditor
                  value={form.description}
                  onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder="Add a short property note, context, or condition summary…"
                />
              </div>
            </div>

            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-3 pt-2">
              {canArchive ? (
                <button
                  type="button"
                  onClick={toggleArchived}
                  disabled={acting}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    initial.deletedAt
                      ? 'bg-brand-700 text-white hover:bg-brand-800'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  } disabled:opacity-60`}
                >
                  {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {initial.deletedAt ? 'Restore Property' : 'Archive Property'}
                </button>
              ) : <span />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    resetForm()
                  }}
                  className={secondaryButtonClassName}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  )
}
