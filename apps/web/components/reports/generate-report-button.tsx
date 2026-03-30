'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus2, Loader2 } from 'lucide-react'

type ReportResponse = {
  id: string
}

export function GenerateReportButton({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function generateReport() {
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/reports`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErrorMsg(json?.error?.message ?? 'Failed to generate report')
        return
      }

      const report = json.data as ReportResponse
      router.push(`/cases/${caseId}/reports/${report.id}`)
      router.refresh()
    } catch {
      setErrorMsg('Failed to generate report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={generateReport}
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FilePlus2 className="h-4 w-4" />
        )}
        Generate New Version
      </button>
      {errorMsg ? (
        <p className="max-w-xs text-right text-xs text-red-600">{errorMsg}</p>
      ) : null}
    </div>
  )
}
