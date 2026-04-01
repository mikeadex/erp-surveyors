'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateCaseSchema, type CreateCaseInput } from '@valuation-os/utils'
import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface SelectOption {
  id: string
  clientId?: string | null
  name?: string
  firstName?: string
  lastName?: string
  type?: string
  address?: string
  city?: string
  state?: string
  role?: string
}

interface NewCaseFormProps {
  clients: SelectOption[]
  properties: SelectOption[]
  valuers: SelectOption[]
  branches: SelectOption[]
  onCancel?: () => void
}

const VALUATION_TYPES = [
  'market', 'rental', 'mortgage', 'insurance', 'probate', 'commercial', 'land',
] as const

const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'
const secondaryButtonClassName =
  'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'

function toIsoDateTime(value: unknown) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return trimmed

  return parsed.toISOString()
}

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function NewCaseForm({
  clients,
  properties,
  valuers,
  branches,
  onCancel,
}: NewCaseFormProps) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(CreateCaseSchema),
    defaultValues: {
      branchId: branches.length === 1 ? branches[0].id : undefined,
    },
  })
  const selectedBranchId = watch('branchId')
  const selectedClientId = watch('clientId')
  const selectedPropertyId = watch('propertyId')
  const selectedReviewerId = watch('assignedReviewerId')

  const valuerOptions = useMemo(
    () => valuers.filter((user) => ['valuer', 'reviewer', 'managing_partner', 'field_officer'].includes(user.role ?? '')),
    [valuers],
  )

  const reviewerOptions = useMemo(
    () => valuers.filter((user) => ['reviewer', 'managing_partner'].includes(user.role ?? '')),
    [valuers],
  )

  const filteredProperties = useMemo(
    () => properties.filter((property) => property.clientId === selectedClientId),
    [properties, selectedClientId],
  )

  useEffect(() => {
    if (!selectedClientId) {
      if (selectedPropertyId) {
        setValue('propertyId', '', { shouldDirty: true })
      }
      clearErrors('propertyId')
      return
    }

    if (!filteredProperties.some((property) => property.id === selectedPropertyId)) {
      setValue('propertyId', '', { shouldDirty: true })
      clearErrors('propertyId')
      return
    }

    if (selectedPropertyId) {
      clearErrors('propertyId')
    }
  }, [clearErrors, filteredProperties, selectedClientId, selectedPropertyId, setValue])

  useEffect(() => {
    if (!selectedReviewerId) return
    if (!reviewerOptions.some((reviewer) => reviewer.id === selectedReviewerId)) {
      setValue('assignedReviewerId', undefined, { shouldDirty: true })
      clearErrors('assignedReviewerId')
    }
  }, [clearErrors, reviewerOptions, selectedReviewerId, setValue])

  async function onSubmit(data: CreateCaseInput) {
    setErrorMsg(null)
    const res = await fetch('/api/v1/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to create case')
      return
    }
    router.push(`/cases/${json.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Case Information</h2>
          <p className="mt-1 text-xs text-slate-500">
            Link the instruction to the right client, property, and valuation intent.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>
              Client <span className="text-red-500">*</span>
            </label>
            <select
              {...register('clientId')}
              className={inputClassName}
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="mt-1 text-xs text-red-600">{errors.clientId.message}</p>
            )}
          </div>

          <div>
            <label className={labelClassName}>
              Valuation Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('valuationType')}
              className={inputClassName}
            >
              <option value="">Select type…</option>
              {VALUATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            {errors.valuationType && (
              <p className="mt-1 text-xs text-red-600">{errors.valuationType.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className={labelClassName}>
            Property <span className="text-red-500">*</span>
          </label>
          <select
            {...register('propertyId')}
            className={`${inputClassName} ${!selectedClientId ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 focus:border-slate-200 focus:ring-0' : ''}`}
            disabled={!selectedClientId}
          >
            <option value="">
              {!selectedClientId
                ? 'Select client first…'
                : filteredProperties.length === 0
                  ? 'No properties found for this client'
                  : 'Select property…'}
            </option>
            {filteredProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}{p.city ? `, ${p.city}` : ''}{p.state ? `, ${p.state}` : ''}
              </option>
            ))}
          </select>
          {!selectedClientId ? (
            <p className="mt-1 text-xs text-slate-500">
              Choose a client first so we can show only that client’s properties.
            </p>
          ) : null}
          {selectedClientId && filteredProperties.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              Add or reassign a property to this client before opening the case.
            </p>
          ) : null}
          {errors.propertyId && (
            <p className="mt-1 text-xs text-red-600">{errors.propertyId.message}</p>
          )}
        </div>

        <div>
          <label className={labelClassName}>
            Valuation Purpose
          </label>
          <input
            {...register('valuationPurpose')}
            type="text"
            placeholder="e.g. Mortgage, Sale, Insurance…"
            className={inputClassName}
          />
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Assignment</h2>
          <p className="mt-1 text-xs text-slate-500">
            Set ownership, reviewer flow, branch scope, and timing before the case opens.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>
              Assigned Valuer <span className="text-red-500">*</span>
            </label>
            <select
              {...register('assignedValuerId')}
              className={inputClassName}
            >
              <option value="">Select valuer…</option>
              {valuerOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.firstName} {v.lastName} ({v.role})
                </option>
              ))}
            </select>
            {errors.assignedValuerId && (
              <p className="mt-1 text-xs text-red-600">{errors.assignedValuerId.message}</p>
            )}
          </div>

          <div>
            <label className={labelClassName}>
              Assigned Reviewer
            </label>
            <select
              {...register('assignedReviewerId', {
                setValueAs: emptyToUndefined,
              })}
              className={inputClassName}
            >
              <option value="">None</option>
              {reviewerOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.firstName} {v.lastName} ({v.role})
                </option>
              ))}
            </select>
          </div>

          {branches.length > 0 && (
            <div>
              <label className={labelClassName}>
                Branch {branches.length === 1 && <span className="text-red-500">*</span>}
              </label>
              <select
                {...register('branchId', {
                  setValueAs: emptyToUndefined,
                })}
                className={inputClassName}
              >
                {branches.length > 1 && <option value="">No branch</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {selectedBranchId && (
                <p className="mt-1 text-xs text-slate-500">
                  This case will be tracked under the selected branch.
                </p>
              )}
            </div>
          )}

          <div>
            <label className={labelClassName}>Due Date</label>
            <input
              {...register('dueDate', {
                setValueAs: toIsoDateTime,
              })}
              type="datetime-local"
              className={inputClassName}
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-600">{errors.dueDate.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Fees And Notes</h2>
          <p className="mt-1 text-xs text-slate-500">
            Capture commercial context and any opening notes the team should see immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>Fee Amount (₦)</label>
            <input
              {...register('feeAmount', {
                setValueAs: optionalNumber,
              })}
              type="number"
              min={0}
              step={0.01}
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label className={labelClassName}>Internal Notes</label>
          <textarea
            {...register('internalNotes')}
            rows={5}
            placeholder="Add any kickoff context for the valuation team…"
            className={`${inputClassName} min-h-[140px] resize-y`}
          />
        </div>
      </section>

      {errorMsg && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

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
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Case
        </button>
      </div>
    </form>
  )
}
