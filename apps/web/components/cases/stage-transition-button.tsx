'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { isValidTransition, STAGE_ORDER, getCaseStageLabel } from '@valuation-os/utils'
import type { CaseStage } from '@valuation-os/types'
import { ChevronRight, Loader2 } from 'lucide-react'

interface StageTransitionButtonProps {
  caseId: string
  currentStage: CaseStage
}

export function StageTransitionButton({ caseId, currentStage }: StageTransitionButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const nextStageIndex = STAGE_ORDER.indexOf(currentStage) + 1
  const nextStage = STAGE_ORDER[nextStageIndex] as CaseStage | undefined

  if (!nextStage || !isValidTransition(currentStage, nextStage)) return null

  async function handleTransition() {
    setError(null)
    const res = await fetch(`/api/v1/cases/${caseId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: nextStage }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to advance stage')
      return
    }

    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleTransition}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Advance to {getCaseStageLabel(nextStage)}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
