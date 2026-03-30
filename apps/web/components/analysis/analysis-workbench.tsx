'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SimpleRichTextEditor } from '@/components/ui/simple-rich-text-editor'

type Analysis = {
  id: string
  method: string
  basisOfValue: string
  concludedValue: unknown
  valuationDate: Date | null
  status: string
  assumptions: unknown
  specialAssumptions: unknown
  comparableGrid: unknown
  commentary: unknown
}

type CaseComparable = {
  id: string
  weight: unknown
  relevanceScore: number | null
  adjustmentAmount: unknown
  adjustmentNote: string | null
  comparable: {
    id: string
    comparableType: string
    address: string
    salePrice: unknown
    rentalValue: unknown
    propertyUse: string | null
    pricePerSqm: unknown
    transactionDate: Date | null
    source: string | null
    isVerified: boolean
  }
}

type SuggestedComparable = {
  id: string
  score: number
  comparableType: string
  address: string
  city: string | null
  state: string | null
  propertyUse: string | null
  tenureType: string | null
  salePrice: unknown
  rentalValue: unknown
  transactionDate: Date | null
  isVerified: boolean
  createdAt: Date
}

const schema = z.object({
  method: z.enum(['sales_comparison', 'income_capitalisation', 'discounted_cash_flow', 'cost', 'profits', 'residual']),
  basisOfValue: z.enum(['market_value', 'fair_value', 'investment_value', 'liquidation_value']),
  commentary: z.string().optional(),
  concludedValue: z.string().optional(),
  valuationDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const METHOD_LABELS: Record<string, string> = {
  sales_comparison: 'Sales Comparison',
  income_capitalisation: 'Income Capitalisation',
  discounted_cash_flow: 'Discounted Cash Flow',
  cost: 'Cost (Contractors)',
  profits: 'Profits',
  residual: 'Residual',
}

const BASIS_LABELS: Record<string, string> = {
  market_value: 'Market Value',
  fair_value: 'Fair Value',
  investment_value: 'Investment Value',
  liquidation_value: 'Liquidation Value',
}

interface Props {
  caseId: string
  analysis: Analysis | null
  comparables: CaseComparable[]
  suggestedComparables: SuggestedComparable[]
  hasReports: boolean
}

type ComparableEditState = {
  weight: string
  relevanceScore: string
  adjustmentAmount: string
  adjustmentNote: string
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function AnalysisWorkbench({
  caseId,
  analysis,
  comparables,
  suggestedComparables,
  hasReports,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [savingComparableId, setSavingComparableId] = useState<string | null>(null)
  const isComplete = analysis?.status === 'complete'
  const [commentary, setCommentary] = useState(
    typeof analysis?.commentary === 'string' ? analysis.commentary : '',
  )
  const [assumptions, setAssumptions] = useState<Array<{ id: string; text: string }>>(
    Array.isArray(analysis?.assumptions)
      ? (analysis?.assumptions as Array<{ id: string; text: string }>)
      : [],
  )
  const [specialAssumptions, setSpecialAssumptions] = useState<Array<{ id: string; text: string }>>(
    Array.isArray(analysis?.specialAssumptions)
      ? (analysis?.specialAssumptions as Array<{ id: string; text: string }>)
      : [],
  )
  const [comparableEdits, setComparableEdits] = useState<Record<string, ComparableEditState>>(
    Object.fromEntries(
      comparables.map((cc) => [
        cc.id,
        {
          weight: cc.weight != null ? String(cc.weight) : '',
          relevanceScore: cc.relevanceScore != null ? String(cc.relevanceScore) : '',
          adjustmentAmount: cc.adjustmentAmount != null ? String(cc.adjustmentAmount) : '',
          adjustmentNote: cc.adjustmentNote ?? '',
        },
      ]),
    ),
  )

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: (analysis?.method as FormData['method']) ?? 'sales_comparison',
      basisOfValue: (analysis?.basisOfValue as FormData['basisOfValue']) ?? 'market_value',
      commentary: typeof analysis?.commentary === 'string' ? analysis.commentary : '',
      concludedValue: analysis?.concludedValue != null ? String(analysis.concludedValue) : '',
      valuationDate: analysis?.valuationDate
        ? new Date(analysis.valuationDate).toISOString().slice(0, 10)
        : '',
    },
  })

  const weightedAverageRate = comparables.reduce(
    (acc, item) => {
      const rate = item.comparable.pricePerSqm != null ? Number(item.comparable.pricePerSqm) : null
      const weight = item.weight != null ? Number(item.weight) : null
      if (rate == null || weight == null || Number.isNaN(rate) || Number.isNaN(weight) || weight <= 0) {
        return acc
      }

      return {
        weightedRate: acc.weightedRate + rate * weight,
        totalWeight: acc.totalWeight + weight,
      }
    },
    { weightedRate: 0, totalWeight: 0 },
  )

  const marketIndicator =
    weightedAverageRate.totalWeight > 0
      ? weightedAverageRate.weightedRate / weightedAverageRate.totalWeight
      : null

  const derivedComparableRows = useMemo(() => {
    return comparables.map((item) => {
      const values = comparableEdits[item.id] ?? {
        weight: item.weight != null ? String(item.weight) : '',
        relevanceScore: item.relevanceScore != null ? String(item.relevanceScore) : '',
        adjustmentAmount: item.adjustmentAmount != null ? String(item.adjustmentAmount) : '',
        adjustmentNote: item.adjustmentNote ?? '',
      }
      const weight = toNullableNumber(values.weight)
      const relevanceScore = toNullableNumber(values.relevanceScore)
      const adjustmentAmount = toNullableNumber(values.adjustmentAmount) ?? 0
      const baseValue =
        toNullableNumber(item.comparable.salePrice) ?? toNullableNumber(item.comparable.rentalValue)
      const adjustedValue = baseValue != null ? baseValue + adjustmentAmount : null

      return {
        id: item.id,
        comparableId: item.comparable.id,
        address: item.comparable.address,
        comparableType: item.comparable.comparableType,
        propertyType: item.comparable.propertyUse,
        priceAmount: baseValue,
        ratePerSqm: toNullableNumber(item.comparable.pricePerSqm),
        evidenceDate: item.comparable.transactionDate,
        source: item.comparable.source,
        relevanceScore,
        weight,
        adjustmentAmount,
        adjustmentNote: values.adjustmentNote.trim() || null,
        adjustedValue,
        isVerified: item.comparable.isVerified,
      }
    })
  }, [comparableEdits, comparables])

  const weightedAdjustedIndicator = useMemo(() => {
    const totals = derivedComparableRows.reduce(
      (acc, item) => {
        if (item.adjustedValue == null || item.weight == null || item.weight <= 0) return acc
        return {
          weightedValue: acc.weightedValue + item.adjustedValue * item.weight,
          totalWeight: acc.totalWeight + item.weight,
        }
      },
      { weightedValue: 0, totalWeight: 0 },
    )

    return totals.totalWeight > 0 ? totals.weightedValue / totals.totalWeight : null
  }, [derivedComparableRows])

  const averageRelevance = useMemo(() => {
    const scored = derivedComparableRows.filter((item) => item.relevanceScore != null)
    if (scored.length === 0) return null
    return scored.reduce((sum, item) => sum + (item.relevanceScore ?? 0), 0) / scored.length
  }, [derivedComparableRows])

  const normaliseAssumptionList = (items: Array<{ id: string; text: string }>) =>
    items
      .map((item) => ({ id: item.id, text: item.text.trim() }))
      .filter((item) => item.text.length > 0)

  const addAssumption = (type: 'standard' | 'special') => {
    const nextItem = { id: crypto.randomUUID(), text: '' }
    if (type === 'standard') {
      setAssumptions((current) => [...current, nextItem])
      return
    }
    setSpecialAssumptions((current) => [...current, nextItem])
  }

  const updateAssumption = (
    type: 'standard' | 'special',
    id: string,
    text: string,
  ) => {
    const setter = type === 'standard' ? setAssumptions : setSpecialAssumptions
    setter((current) => current.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  const removeAssumption = (type: 'standard' | 'special', id: string) => {
    const setter = type === 'standard' ? setAssumptions : setSpecialAssumptions
    setter((current) => current.filter((item) => item.id !== id))
  }

  const onSave = async (data: FormData) => {
    setError('')
    const endpoint = analysis
      ? `/api/v1/cases/${caseId}/analysis`
      : `/api/v1/cases/${caseId}/analysis`
    const method = analysis ? 'PATCH' : 'POST'

    const body: Record<string, unknown> = {
      method: data.method,
      basisOfValue: data.basisOfValue,
    }
    if (data.concludedValue) body.concludedValue = parseFloat(data.concludedValue)
    if (data.valuationDate) body.valuationDate = new Date(data.valuationDate).toISOString()
    body.assumptions = normaliseAssumptionList(assumptions)
    body.specialAssumptions = normaliseAssumptionList(specialAssumptions)
    body.commentary = commentary.trim() || undefined
    body.comparableGrid = {
      items: derivedComparableRows,
      summary: {
        comparableCount: derivedComparableRows.length,
        weightedAverageRate: marketIndicator,
        weightedAdjustedIndicator,
        averageRelevance,
      },
    }

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.message ?? 'Failed to save analysis')
      return
    }

    router.refresh()
  }

  const onComplete = async () => {
    setCompleting(true)
    setError('')
    const res = await fetch(`/api/v1/cases/${caseId}/analysis/complete`, { method: 'POST' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.message ?? 'Failed to complete analysis')
    } else {
      router.refresh()
    }
    setCompleting(false)
  }

  const attachComparable = async (comparableId: string) => {
    setLinkingId(comparableId)
    setError('')
    const res = await fetch(`/api/v1/cases/${caseId}/comparables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comparableId }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to attach comparable')
    } else {
      router.refresh()
    }
    setLinkingId(null)
  }

  const removeComparable = async (comparableId: string) => {
    setRemovingId(comparableId)
    setError('')
    const res = await fetch(`/api/v1/cases/${caseId}/comparables/${comparableId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to remove comparable')
    } else {
      router.refresh()
    }
    setRemovingId(null)
  }

  const updateComparableEdit = (id: string, patch: Partial<ComparableEditState>) => {
    setComparableEdits((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          weight: '',
          relevanceScore: '',
          adjustmentAmount: '',
          adjustmentNote: '',
        }),
        ...patch,
      },
    }))
  }

  const saveComparableEvidence = async (id: string, comparableId: string) => {
    const values = comparableEdits[id]
    if (!values) return

    setSavingComparableId(id)
    setError('')

    const res = await fetch(`/api/v1/cases/${caseId}/comparables/${comparableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: values.weight === '' ? undefined : Number(values.weight),
        relevanceScore: values.relevanceScore === '' ? undefined : Number(values.relevanceScore),
        adjustmentAmount: values.adjustmentAmount === '' ? undefined : Number(values.adjustmentAmount),
        adjustmentNote: values.adjustmentNote.trim() || undefined,
      }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to update comparable evidence')
    } else {
      router.refresh()
    }

    setSavingComparableId(null)
  }

  return (
    <div className="space-y-6">
      {hasReports && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This case already has report output. Any analysis changes should be reviewed carefully before the report is reissued.
        </div>
      )}

      {isComplete && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
          Analysis is complete. Values are locked.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Valuation Parameters</h2>

        <form onSubmit={handleSubmit(onSave)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                {...register('method')}
                disabled={isComplete}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                {Object.entries(METHOD_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.method && <p className="mt-1 text-xs text-red-600">{errors.method.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Basis of Value</label>
              <select
                {...register('basisOfValue')}
                disabled={isComplete}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                {Object.entries(BASIS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concluded Value (₦)</label>
              <input
                type="number"
                step="0.01"
                {...register('concludedValue')}
                disabled={isComplete}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuation Date</label>
              <input
                type="date"
                {...register('valuationDate')}
                disabled={isComplete}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!isComplete && (
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : analysis ? 'Save Changes' : 'Create Analysis'}
              </button>
              {analysis && (
                <button
                  type="button"
                  onClick={onComplete}
                  disabled={completing}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {completing ? 'Completing…' : 'Mark Complete'}
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Reconciliation Note</h2>
          <p className="mt-1 text-sm text-gray-500">
            Explain how the comparable evidence, adjustments, and assumptions support the concluded value.
          </p>
          {weightedAdjustedIndicator != null && analysis?.concludedValue != null ? (
            <p className="mt-2 text-xs text-gray-500">
              Weighted indication: ₦{weightedAdjustedIndicator.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              {' '}vs concluded value: ₦{Number(analysis.concludedValue).toLocaleString()}.
              Use this note to explain any deliberate difference.
            </p>
          ) : null}
        </div>

        <SimpleRichTextEditor
          value={commentary}
          onChange={setCommentary}
          placeholder="Summarise why the evidence supports the opinion of value, including any weighting and adjustment judgement."
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Valuation Signals</h2>
            <p className="mt-1 text-sm text-gray-500">
              Quick indicators from the attached comparable evidence.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Attached</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{comparables.length}</p>
            <p className="mt-1 text-sm text-gray-500">Comparable records in the case workbench.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Weighted Rate</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {marketIndicator != null ? `₦${marketIndicator.toLocaleString(undefined, { maximumFractionDigits: 0 })}/sqm` : '—'}
            </p>
            <p className="mt-1 text-sm text-gray-500">Uses only comparables with both rate and weight.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Weighted Indication</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {weightedAdjustedIndicator != null
                ? `₦${weightedAdjustedIndicator.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : '—'}
            </p>
            <p className="mt-1 text-sm text-gray-500">Weighted from adjusted comparable values.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Concluded Value</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {analysis?.concludedValue != null
                ? `₦${Number(analysis.concludedValue).toLocaleString()}`
                : 'Not concluded'}
            </p>
            <p className="mt-1 text-sm text-gray-500">The current headline valuation output.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Average Relevance</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {averageRelevance != null ? `${averageRelevance.toFixed(1)}/5` : '—'}
            </p>
            <p className="mt-1 text-sm text-gray-500">Average of case-specific relevance scores.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Assumptions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Capture the standard and special assumptions supporting this opinion of value.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Standard Assumptions</h3>
              {!isComplete && (
                <button
                  type="button"
                  onClick={() => addAssumption('standard')}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Add assumption
                </button>
              )}
            </div>

            <div className="space-y-3">
              {assumptions.length > 0 ? assumptions.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Assumption {index + 1}
                    </p>
                    {!isComplete && (
                      <button
                        type="button"
                        onClick={() => removeAssumption('standard', item.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    value={item.text}
                    onChange={(event) => updateAssumption('standard', item.id, event.target.value)}
                    disabled={isComplete}
                    rows={3}
                    placeholder="Add a standard valuation assumption..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:bg-white"
                  />
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No standard assumptions recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Special Assumptions</h3>
              {!isComplete && (
                <button
                  type="button"
                  onClick={() => addAssumption('special')}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Add special
                </button>
              )}
            </div>

            <div className="space-y-3">
              {specialAssumptions.length > 0 ? specialAssumptions.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Special {index + 1}
                    </p>
                    {!isComplete && (
                      <button
                        type="button"
                        onClick={() => removeAssumption('special', item.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    value={item.text}
                    onChange={(event) => updateAssumption('special', item.id, event.target.value)}
                    disabled={isComplete}
                    rows={3}
                    placeholder="Add a special assumption..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:bg-white"
                  />
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No special assumptions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {comparables.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Attached Comparables</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Address</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Use</th>
                  <th className="pb-2 pr-4">Evidence Value</th>
                  <th className="pb-2 pr-4">Rate</th>
                  <th className="pb-2 pr-4">Relevance</th>
                  <th className="pb-2 pr-4">Adjustment</th>
                  <th className="pb-2 pr-4">Adjusted Value</th>
                  <th className="pb-2">Weight</th>
                  {!isComplete && <th className="pb-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparables.map((cc) => {
                  const derived = derivedComparableRows.find((item) => item.id === cc.id)
                  return (
                  <tr key={cc.id}>
                    <td className="py-2 pr-4 text-gray-900">{cc.comparable.address}</td>
                    <td className="py-2 pr-4 text-gray-500 capitalize">{cc.comparable.comparableType}</td>
                    <td className="py-2 pr-4 text-gray-500">{cc.comparable.propertyUse}</td>
                    <td className="py-2 pr-4 text-gray-900">
                      {cc.comparable.salePrice != null
                        ? `₦${Number(cc.comparable.salePrice).toLocaleString()}`
                        : cc.comparable.rentalValue != null
                          ? `₦${Number(cc.comparable.rentalValue).toLocaleString()}/yr`
                          : '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {cc.comparable.pricePerSqm != null ? `₦${Number(cc.comparable.pricePerSqm).toLocaleString()}/sqm` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {isComplete ? (
                        cc.relevanceScore != null ? `${cc.relevanceScore}/5` : '—'
                      ) : (
                        <select
                          value={comparableEdits[cc.id]?.relevanceScore ?? ''}
                          onChange={(event) => updateComparableEdit(cc.id, { relevanceScore: event.target.value })}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                        >
                          <option value="">—</option>
                          {[1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>{value}/5</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {isComplete ? (
                        cc.adjustmentAmount != null
                          ? `₦${Number(cc.adjustmentAmount).toLocaleString()}`
                          : cc.adjustmentNote
                            ? cc.adjustmentNote
                            : '—'
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="number"
                            step="0.01"
                            value={comparableEdits[cc.id]?.adjustmentAmount ?? ''}
                            onChange={(event) => updateComparableEdit(cc.id, { adjustmentAmount: event.target.value })}
                            placeholder="Amount"
                            className="w-28 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                          />
                          <textarea
                            value={comparableEdits[cc.id]?.adjustmentNote ?? ''}
                            onChange={(event) => updateComparableEdit(cc.id, { adjustmentNote: event.target.value })}
                            rows={2}
                            placeholder="Adjustment note"
                            className="w-44 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {derived?.adjustedValue != null
                        ? `₦${derived.adjustedValue.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="py-2 text-gray-500">
                      {isComplete ? (
                        cc.weight != null ? String(cc.weight) : '—'
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={comparableEdits[cc.id]?.weight ?? ''}
                          onChange={(event) => updateComparableEdit(cc.id, { weight: event.target.value })}
                          placeholder="Weight"
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                        />
                      )}
                    </td>
                    {!isComplete && (
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => saveComparableEvidence(cc.id, cc.comparable.id)}
                            disabled={savingComparableId === cc.id}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            {savingComparableId === cc.id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeComparable(cc.comparable.id)}
                            disabled={removingId === cc.comparable.id}
                            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {removingId === cc.comparable.id ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {suggestedComparables.length > 0 && !isComplete && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Suggested Comparables</h2>
              <p className="mt-1 text-sm text-gray-500">
                Ranked from the property profile so you can attach them directly to this case.
              </p>
            </div>
            <Link href={`/comparables?state=${encodeURIComponent(String(suggestedComparables[0]?.state ?? ''))}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Browse all comparables
            </Link>
          </div>

          <div className="space-y-3">
            {suggestedComparables.map((comp) => (
              <div key={comp.id} className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{comp.address}</p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Score {comp.score}
                    </span>
                    {comp.isVerified && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {[comp.city, comp.state, comp.propertyUse].filter(Boolean).join(' • ')}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    {comp.salePrice != null
                      ? `₦${Number(comp.salePrice).toLocaleString()}`
                      : comp.rentalValue != null
                        ? `₦${Number(comp.rentalValue).toLocaleString()}/yr`
                        : 'No pricing yet'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link href={`/comparables/${comp.id}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => attachComparable(comp.id)}
                    disabled={linkingId === comp.id}
                    className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {linkingId === comp.id ? 'Attaching…' : 'Attach'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
