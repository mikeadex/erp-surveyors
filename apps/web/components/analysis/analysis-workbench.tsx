'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
}

export function AnalysisWorkbench({ caseId, analysis, comparables }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
