'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateCaseSchema, type CreateCaseInput } from '@valuation-os/utils'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface SelectOption {
  id: string
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
}

const VALUATION_TYPES = [
  'market', 'rental', 'mortgage', 'insurance', 'probate', 'commercial', 'land',
] as const

export function NewCaseForm({ clients, properties, valuers, branches }: NewCaseFormProps) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(CreateCaseSchema),
    defaultValues: {
      branchId: branches.length === 1 ? branches[0].id : undefined,
    },
  })
  const selectedBranchId = watch('branchId')

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
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Case Information</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              {...register('clientId')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Valuation Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('valuationType')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Property <span className="text-red-500">*</span>
          </label>
          <select
            {...register('propertyId')}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}{p.city ? `, ${p.city}` : ''}{p.state ? `, ${p.state}` : ''}
              </option>
            ))}
          </select>
          {errors.propertyId && (
            <p className="mt-1 text-xs text-red-600">{errors.propertyId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Valuation Purpose
          </label>
          <input
            {...register('valuationPurpose')}
            type="text"
            placeholder="e.g. Mortgage, Sale, Insurance…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Assignment</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Assigned Valuer <span className="text-red-500">*</span>
            </label>
            <select
              {...register('assignedValuerId')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select valuer…</option>
              {valuers.map((v) => (
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
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Assigned Reviewer
            </label>
            <select
              {...register('assignedReviewerId')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None</option>
              {valuers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.firstName} {v.lastName} ({v.role})
                </option>
              ))}
            </select>
          </div>

          {branches.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Branch {branches.length === 1 && <span className="text-red-500">*</span>}
              </label>
              <select
                {...register('branchId')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {branches.length > 1 && <option value="">No branch</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {selectedBranchId && (
                <p className="mt-1 text-xs text-gray-500">
                  This case will be tracked under the selected branch.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input
              {...register('dueDate')}
              type="datetime-local"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Fees & Notes</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fee Amount (₦)</label>
            <input
              {...register('feeAmount', { valueAsNumber: true })}
              type="number"
              min={0}
              step={0.01}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Internal Notes</label>
          <textarea
            {...register('internalNotes')}
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
          Create Case
        </button>
      </div>
    </form>
  )
}
