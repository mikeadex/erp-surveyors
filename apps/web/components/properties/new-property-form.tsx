'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreatePropertySchema, type CreatePropertyInput } from '@valuation-os/utils'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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

function labelOf(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type PropertyCreateRequest = CreatePropertyInput & {
  allowDuplicate?: boolean
}

const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'

export function NewPropertyForm({ onCancel }: { onCancel?: () => void } = {}) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{
    id: string
    address: string
    city: string
    state: string
    distance: number
  }>>([])
  const [pendingDuplicatePayload, setPendingDuplicatePayload] = useState<PropertyCreateRequest | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(CreatePropertySchema),
  })
  const descriptionValue = watch('description') ?? ''

  async function submitPayload(payload: PropertyCreateRequest) {
    const res = await fetch('/api/v1/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (res.status === 409 && json?.error?.code === 'DUPLICATE_PROPERTY') {
      setDuplicateWarnings(json?.data?.duplicateMatches ?? [])
      setPendingDuplicatePayload(payload)
      setErrorMsg('Possible duplicate properties found. Review them before creating a new record.')
      return
    }
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to create property')
      return
    }
    setDuplicateWarnings([])
    setPendingDuplicatePayload(null)
    router.push(`/properties/${json.data.id}`)
  }

  async function onSubmit(data: CreatePropertyInput) {
    setErrorMsg(null)
    setDuplicateWarnings([])
    setPendingDuplicatePayload(null)
    await submitPayload(data)
  }

  async function createDespiteDuplicates() {
    if (!pendingDuplicatePayload) return
    setErrorMsg(null)
    await submitPayload({ ...pendingDuplicatePayload, allowDuplicate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Location</h2>

        <div>
          <label htmlFor="address" className={labelClassName}>
            Address <span className="text-red-500">*</span>
          </label>
          <input
            {...register('address')}
            id="address"
            className={inputClassName}
          />
          {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(['city', 'localGovernment', 'state'] as const).map((f) => (
            <div key={f}>
              <label htmlFor={f} className={labelClassName}>
                {labelOf(f)}
                {f === 'city' || f === 'state' ? <span className="text-red-500 ml-0.5">*</span> : null}
              </label>
              <input
                {...register(f)}
                id={f}
                className={inputClassName}
              />
              {errors[f] && <p className="mt-1 text-xs text-red-600">{errors[f]?.message}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Classification</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="propertyUse" className={labelClassName}>
              Property Use <span className="text-red-500">*</span>
            </label>
            <select
              {...register('propertyUse')}
              id="propertyUse"
              className={inputClassName}
            >
              <option value="">Select…</option>
              {PROPERTY_USES.map((u) => (
                <option key={u} value={u}>{labelOf(u)}</option>
              ))}
            </select>
            {errors.propertyUse && <p className="mt-1 text-xs text-red-600">{errors.propertyUse.message}</p>}
          </div>

          <div>
            <label htmlFor="tenureType" className={labelClassName}>
              Tenure Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('tenureType')}
              id="tenureType"
              className={inputClassName}
            >
              <option value="">Select…</option>
              {TENURE_TYPES.map((t) => (
                <option key={t} value={t}>{labelOf(t)}</option>
              ))}
            </select>
            {errors.tenureType && <p className="mt-1 text-xs text-red-600">{errors.tenureType.message}</p>}
          </div>
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Dimensions And Notes</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="plotSize" className={labelClassName}>
              Plot Size
            </label>
            <input
              {...register('plotSize', {
                setValueAs: (value) => (value === '' ? undefined : Number(value)),
              })}
              id="plotSize"
              type="number"
              min={0}
              step={0.01}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="plotSizeUnit" className={labelClassName}>
              Unit
            </label>
            <select
              {...register('plotSizeUnit')}
              id="plotSizeUnit"
              className={inputClassName}
            >
              <option value="sqm">sqm</option>
              <option value="sqft">sqft</option>
              <option value="hectare">hectare</option>
              <option value="acres">acres</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Any non-sqm value is converted and stored canonically as sqm.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="description" className={labelClassName}>
            Description Notes
          </label>
          <SimpleRichTextEditor
            value={descriptionValue}
            onChange={(nextValue) => setValue('description', nextValue, { shouldDirty: true })}
            placeholder="Add a short property note, context, or condition summary…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="latitude" className={labelClassName}>
              Latitude
            </label>
            <input
              {...register('latitude', {
                setValueAs: (value) => (value === '' ? undefined : Number(value)),
              })}
              id="latitude"
              type="number"
              min={-90}
              max={90}
              step={0.0000001}
              className={inputClassName}
            />
            {errors.latitude && <p className="mt-1 text-xs text-red-600">{errors.latitude.message}</p>}
          </div>

          <div>
            <label htmlFor="longitude" className={labelClassName}>
              Longitude
            </label>
            <input
              {...register('longitude', {
                setValueAs: (value) => (value === '' ? undefined : Number(value)),
              })}
              id="longitude"
              type="number"
              min={-180}
              max={180}
              step={0.0000001}
              className={inputClassName}
            />
            {errors.longitude && <p className="mt-1 text-xs text-red-600">{errors.longitude.message}</p>}
          </div>
        </div>
      </section>

      {errorMsg && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {duplicateWarnings.length > 0 && (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Possible duplicate properties</h3>
          <p className="mt-1 text-sm text-amber-800">
            These records look similar by address, city, and state. Review them before creating a new property.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicateWarnings.map((match) => (
              <li key={match.id} className="rounded-2xl bg-white/80 px-3 py-2.5">
                <div className="text-sm font-medium text-amber-950">{match.address}</div>
                <div className="text-xs text-amber-700">
                  {[match.city, match.state].filter(Boolean).join(', ')} • Distance {match.distance}
                </div>
                <div className="mt-2">
                  <Link href={`/properties/${match.id}`} className="text-xs font-semibold text-amber-900 underline">
                    Review existing property
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDuplicateWarnings([])
                setPendingDuplicatePayload(null)
                setErrorMsg(null)
              }}
              className="rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Cancel Review
            </button>
            <button
              type="button"
              onClick={createDespiteDuplicates}
              className="rounded-2xl bg-amber-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-800"
            >
              Create Anyway
            </button>
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            if (onCancel) {
              onCancel()
              return
            }
            router.back()
          }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add Property
        </button>
      </div>
    </form>
  )
}
