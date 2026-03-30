'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'

export function PrintReportClient() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 250)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="mx-auto mb-5 flex max-w-5xl items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3 print:hidden">
      <div className="text-sm text-slate-500">
        Use your browser’s destination picker to save this report as PDF.
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
      >
        <Printer className="h-4 w-4" />
        Print Again
      </button>
    </div>
  )
}
