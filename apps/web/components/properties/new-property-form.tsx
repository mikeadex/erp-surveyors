'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreatePropertySchema, type CreatePropertyInput } from '@valuation-os/utils'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

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

export function NewPropertyForm() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(CreatePropertySchema),
  })

  async function onSubmit(data: CreatePropertyInput) {
    setErrorMsg(null)
    const res = await fetch('/api/v1/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to create property')
      return
    }
    router.push(`/properties/${json.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Location</h2>

        <div>
          <label htmlFor="address" className="block text-xs font-medium text-gray-700 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <input
            {...register('address')}
            id="address"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(['city', 'localGovernment', 'state'] as const).map((f) => (
            <div key={f}>
              <label htmlFor={f} className="block text-xs font-medium text-gray-700 mb-1">
                {labelOf(f)}
                {f === 'city' || f === 'state' ? <span className="text-red-500 ml-0.5">*</span> : null}
              </label>
              <input
                {...register(f)}
                id={f}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors[f] && <p className="mt-1 text-xs text-red-600">{errors[f]?.message}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Classification</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="propertyUse" className="block text-xs font-medium text-gray-700 mb-1">
              Property Use <span className="text-red-500">*</span>
            </label>
            <select
              {...register('propertyUse')}
              id="propertyUse"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select…</option>
              {PROPERTY_USES.map((u) => (
                <option key={u} value={u}>{labelOf(u)}</option>
              ))}
            </select>
            {errors.propertyUse && <p className="mt-1 text-xs text-red-600">{errors.propertyUse.message}</p>}
          </div>

          <div>
            <label htmlFor="tenureType" className="block text-xs font-medium text-gray-700 mb-1">
              Tenure Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('tenureType')}
              id="tenureType"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Dimensions (optional)</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="plotSize" className="block text-xs font-medium text-gray-700 mb-1">
              Plot Size
            </label>
            <input
              {...register('plotSize', { valueAsNumber: true })}
              id="plotSize"
              type="number"
              min={0}
              step={0.01}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="plotSizeUnit" className="block text-xs font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              {...register('plotSizeUnit')}
              id="plotSizeUnit"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="sqm">sqm</option>
              <option value="hectare">hectare</option>
              <option value="acres">acres</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </section>

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add Property
        </button>
      </div>
    </form>
  )
}
