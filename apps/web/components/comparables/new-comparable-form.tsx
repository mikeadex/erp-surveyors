'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateComparableSchema, type CreateComparableInput } from '@valuation-os/utils'
import { Loader2 } from 'lucide-react'
import { SimpleRichTextEditor } from '@/components/ui/simple-rich-text-editor'

const COMPARABLE_TYPES = ['sales', 'rental', 'land'] as const
const SIZE_UNITS = ['sqm', 'sqft', 'hectare', 'acres'] as const

function labelOf(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'
const secondaryButtonClassName =
  'rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50'

export function NewComparableForm({ onCancel }: { onCancel?: () => void } = {}) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateComparableInput>({
    resolver: zodResolver(CreateComparableSchema),
  })

  const comparableType = watch('comparableType')
  const notesValue = watch('notes') ?? ''

  async function onSubmit(data: CreateComparableInput) {
    setErrorMsg(null)
    const res = await fetch('/api/v1/comparables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to create comparable')
      return
    }
    router.push(`/comparables/${json.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Comparable Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="comparableType" className={labelClassName}>
              Comparable Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('comparableType')}
              id="comparableType"
              className={inputClassName}
            >
              <option value="">Select…</option>
              {COMPARABLE_TYPES.map((value) => (
                <option key={value} value={value}>{labelOf(value)}</option>
              ))}
            </select>
            {errors.comparableType && <p className="mt-1 text-xs text-red-600">{errors.comparableType.message}</p>}
          </div>

          <div>
            <label htmlFor="transactionDate" className={labelClassName}>
              Transaction Date
            </label>
            <input
              {...register('transactionDate')}
              id="transactionDate"
              type="datetime-local"
              className={inputClassName}
            />
          </div>

          <div className="sm:col-span-2">
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

          <div>
            <label htmlFor="city" className={labelClassName}>City</label>
            <input {...register('city')} id="city" className={inputClassName} />
          </div>
          <div>
            <label htmlFor="state" className={labelClassName}>State</label>
            <input {...register('state')} id="state" className={inputClassName} />
          </div>

          <div>
            <label htmlFor="propertyUse" className={labelClassName}>Property Use</label>
            <input {...register('propertyUse')} id="propertyUse" className={inputClassName} />
          </div>
          <div>
            <label htmlFor="tenureType" className={labelClassName}>Tenure</label>
            <input {...register('tenureType')} id="tenureType" className={inputClassName} />
          </div>
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Pricing and Size</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="salePrice" className={labelClassName}>
              Sale Price
            </label>
            <input
              {...register('salePrice', { setValueAs: (value) => (value === '' ? undefined : Number(value)) })}
              id="salePrice"
              type="number"
              min={0}
              step={0.01}
              disabled={comparableType === 'rental'}
              className={`${inputClassName} disabled:bg-slate-100`}
            />
          </div>
          <div>
            <label htmlFor="rentalValue" className={labelClassName}>
              Rental Value
            </label>
            <input
              {...register('rentalValue', { setValueAs: (value) => (value === '' ? undefined : Number(value)) })}
              id="rentalValue"
              type="number"
              min={0}
              step={0.01}
              disabled={comparableType !== 'rental'}
              className={`${inputClassName} disabled:bg-slate-100`}
            />
          </div>

          <div>
            <label htmlFor="plotSize" className={labelClassName}>Plot Size</label>
            <input
              {...register('plotSize', { setValueAs: (value) => (value === '' ? undefined : Number(value)) })}
              id="plotSize"
              type="number"
              min={0}
              step={0.01}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="plotSizeUnit" className={labelClassName}>Plot Size Unit</label>
            <select
              {...register('plotSizeUnit')}
              id="plotSizeUnit"
              className={inputClassName}
            >
              <option value="">Select…</option>
              {SIZE_UNITS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="buildingSize" className={labelClassName}>Building Size</label>
            <input
              {...register('buildingSize', { setValueAs: (value) => (value === '' ? undefined : Number(value)) })}
              id="buildingSize"
              type="number"
              min={0}
              step={0.01}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="buildingSizeUnit" className={labelClassName}>Building Size Unit</label>
            <select
              {...register('buildingSizeUnit')}
              id="buildingSizeUnit"
              className={inputClassName}
            >
              <option value="">Select…</option>
              <option value="sqm">sqm</option>
              <option value="sqft">sqft</option>
            </select>
          </div>
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Source</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="source" className={labelClassName}>Source</label>
            <input {...register('source')} id="source" className={inputClassName} />
          </div>
          <div>
            <label htmlFor="sourceContact" className={labelClassName}>Source Contact</label>
            <input {...register('sourceContact')} id="sourceContact" className={inputClassName} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className={labelClassName}>Notes</label>
            <SimpleRichTextEditor
              value={notesValue}
              onChange={(nextValue) => setValue('notes', nextValue, { shouldDirty: true })}
              placeholder="Capture comparable context, source caveats, or market observations."
            />
          </div>
        </div>
      </section>

      {errorMsg && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : router.back())}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add Comparable
        </button>
      </div>
    </form>
  )
}
