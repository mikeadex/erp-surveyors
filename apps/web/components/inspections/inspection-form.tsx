'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Loader2, Save, Send } from 'lucide-react'
import { SimpleRichTextEditor } from '@/components/ui/simple-rich-text-editor'

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

const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'

export function InspectionForm({ caseId, inspection }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isSubmitted = inspection?.status === 'submitted'

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
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
  const conditionSummary = watch('conditionSummary') ?? ''
  const notes = watch('notes') ?? ''

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
    <div className="space-y-4">
      {isSubmitted && (
        <div className="rounded-[22px] border border-brand-200 bg-brand-50/80 px-4 py-3 text-sm font-medium text-brand-800">
          This inspection has been submitted and is now read-only.
        </div>
      )}

      <form onSubmit={handleSubmit(onSave)} className="space-y-5">
        <section className={sectionClassName}>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-slate-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Inspection Setup</h2>
              <p className="mt-1 text-xs text-slate-500">
                Record when the site visit happened and the current occupancy context.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName}>Inspection Date</label>
              <input
                type="date"
                {...register('inspectionDate')}
                disabled={isSubmitted}
                className={inputClassName}
              />
              {errors.inspectionDate && (
                <p className="mt-1 text-xs text-red-600">{errors.inspectionDate.message}</p>
              )}
            </div>
            <div>
              <label className={labelClassName}>Occupancy Status</label>
              <input
                type="text"
                {...register('occupancy')}
                disabled={isSubmitted}
                className={inputClassName}
                placeholder="Occupied, vacant, partly occupied…"
              />
              {errors.occupancy && (
                <p className="mt-1 text-xs text-red-600">{errors.occupancy.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelClassName}>Location Description</label>
            <textarea
              {...register('locationDescription')}
              rows={4}
              disabled={isSubmitted}
              placeholder="Describe access, surrounding context, neighbourhood cues, and site approach."
              className={`${inputClassName} min-h-[120px] resize-y`}
            />
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Site Condition</h2>
            <p className="mt-1 text-xs text-slate-500">
              Capture what the team observed externally, internally, and across building services.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className={labelClassName}>External Condition</label>
              <textarea
                {...register('externalCondition')}
                rows={5}
                disabled={isSubmitted}
                placeholder="Frontage, access road, external finishes, drainage, defects…"
                className={`${inputClassName} min-h-[150px] resize-y`}
              />
            </div>
            <div>
              <label className={labelClassName}>Internal Condition</label>
              <textarea
                {...register('internalCondition')}
                rows={5}
                disabled={isSubmitted}
                placeholder="Room layout, finishes, maintenance state, visible deterioration…"
                className={`${inputClassName} min-h-[150px] resize-y`}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName}>Services And Utilities</label>
            <textarea
              {...register('services')}
              rows={4}
              disabled={isSubmitted}
              placeholder="Power, water, waste, telecoms, sewage, security, and other services."
              className={`${inputClassName} min-h-[130px] resize-y`}
            />
          </div>
        </section>

        <section className={sectionClassName}>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Summary And Notes</h2>
            <p className="mt-1 text-xs text-slate-500">
              Keep the main inspection conclusion and supporting notes readable for reviewers.
            </p>
          </div>

          <div>
            <label className={labelClassName}>Condition Summary</label>
            <SimpleRichTextEditor
              value={conditionSummary}
              onChange={(value) => setValue('conditionSummary', value, { shouldDirty: true })}
              placeholder="Summarise the property condition, valuation relevance, and key risk markers."
            />
            {errors.conditionSummary && (
              <p className="mt-1 text-xs text-red-600">{errors.conditionSummary.message}</p>
            )}
          </div>

          <div>
            <label className={labelClassName}>Inspector Notes</label>
            <SimpleRichTextEditor
              value={notes}
              onChange={(value) => setValue('notes', value, { shouldDirty: true })}
              placeholder="Add supporting field notes, next steps, or anything reviewers should keep in view."
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
            )}
          </div>
        </section>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!isSubmitted && (
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </button>
            {inspection && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Inspection
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
