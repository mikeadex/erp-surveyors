'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
type Inspection = {
  id: string
  status: string
  inspectionDate: Date | null
  occupancy: string | null
  locationDescription: string | null
  externalCondition: string | null
  internalCondition: string | null
  services: string | null
  conditionSummary: string | null
  notes: string | null
}

const schema = z.object({
  inspectionDate: z.string().optional(),
  occupancy: z.string().max(100).optional(),
  locationDescription: z.string().optional(),
  externalCondition: z.string().optional(),
  internalCondition: z.string().optional(),
  services: z.string().optional(),
  conditionSummary: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  caseId: string
  inspection: Inspection | null
  currentUserId: string
}

const fields: { name: keyof FormData; label: string; rows?: number }[] = [
  { name: 'inspectionDate', label: 'Inspection Date' },
  { name: 'occupancy', label: 'Occupancy Status' },
  { name: 'locationDescription', label: 'Location Description', rows: 3 },
  { name: 'externalCondition', label: 'External Condition', rows: 4 },
  { name: 'internalCondition', label: 'Internal Condition', rows: 4 },
  { name: 'services', label: 'Services & Utilities', rows: 3 },
  { name: 'conditionSummary', label: 'Condition Summary', rows: 4 },
  { name: 'notes', label: 'Inspector Notes', rows: 3 },
]

export function InspectionForm({ caseId, inspection }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isSubmitted = inspection?.status === 'submitted'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      inspectionDate: inspection?.inspectionDate
        ? new Date(inspection.inspectionDate).toISOString().slice(0, 10)
        : '',
      occupancy: inspection?.occupancy ?? '',
      locationDescription: inspection?.locationDescription ?? '',
      externalCondition: inspection?.externalCondition ?? '',
      internalCondition: inspection?.internalCondition ?? '',
      services: inspection?.services ?? '',
      conditionSummary: inspection?.conditionSummary ?? '',
      notes: inspection?.notes ?? '',
    },
  })

  const onSave = async (data: FormData) => {
    setError('')
    const endpoint = inspection
      ? `/api/v1/cases/${caseId}/inspections/${inspection.id}`
      : `/api/v1/cases/${caseId}/inspections`
    const method = inspection ? 'PATCH' : 'POST'

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        inspectorId: undefined,
      }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.message ?? 'Failed to save inspection')
      return
    }

    router.refresh()
  }

  const onSubmit = async () => {
    if (!inspection) { setError('Save the inspection first before submitting'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch(
      `/api/v1/cases/${caseId}/inspections/${inspection.id}/submit`,
      { method: 'POST' },
    )

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.message ?? 'Failed to submit inspection')
    } else {
      router.refresh()
    }
    setSubmitting(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {isSubmitted && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
          This inspection has been submitted and is now read-only.
        </div>
      )}

      <form onSubmit={handleSubmit(onSave)} className="space-y-5">
        {fields.map(({ name, label, rows }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {rows ? (
              <textarea
                {...register(name)}
                rows={rows}
                disabled={isSubmitted}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            ) : (
              <input
                type={name === 'inspectionDate' ? 'date' : 'text'}
                {...register(name)}
                disabled={isSubmitted}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            )}
            {errors[name] && (
              <p className="mt-1 text-xs text-red-600">{errors[name]?.message}</p>
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isSubmitted && (
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save Draft'}
            </button>
            {inspection && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Inspection'}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
