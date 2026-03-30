'use client'

import { Printer } from 'lucide-react'

export function ReportPrintTrigger({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <Printer className="h-4 w-4" />
      Print / Save PDF
    </a>
  )
}
