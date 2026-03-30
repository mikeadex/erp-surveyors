'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
}

type CaseComparable = {
  id: string
  weight: unknown
  comparable: {
    id: string
    address: string
    salePrice: unknown
    propertyUse: string | null
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
}

export function AnalysisWorkbench({ caseId, analysis, comparables, suggestedComparables }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const isComplete = analysis?.status === 'complete'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: (analysis?.method as FormData['method']) ?? 'sales_comparison',
      basisOfValue: (analysis?.basisOfValue as FormData['basisOfValue']) ?? 'market_value',
      concludedValue: analysis?.concludedValue != null ? String(analysis.concludedValue) : '',
      valuationDate: analysis?.valuationDate
        ? new Date(analysis.valuationDate).toISOString().slice(0, 10)
        : '',
    },
  })

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

  return (
    <div className="space-y-6">
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

      {comparables.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Attached Comparables</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Address</th>
                  <th className="pb-2 pr-4">Use</th>
                  <th className="pb-2 pr-4">Sale Price</th>
                  <th className="pb-2">Weight</th>
                  {!isComplete && <th className="pb-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparables.map((cc) => (
                  <tr key={cc.id}>
                    <td className="py-2 pr-4 text-gray-900">{cc.comparable.address}</td>
                    <td className="py-2 pr-4 text-gray-500">{cc.comparable.propertyUse}</td>
                    <td className="py-2 pr-4 text-gray-900">
                      {cc.comparable.salePrice != null ? `₦${Number(cc.comparable.salePrice).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2 text-gray-500">{cc.weight != null ? String(cc.weight) : '—'}</td>
                    {!isComplete && (
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeComparable(cc.comparable.id)}
                          disabled={removingId === cc.comparable.id}
                          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {removingId === cc.comparable.id ? 'Removing…' : 'Remove'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
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
