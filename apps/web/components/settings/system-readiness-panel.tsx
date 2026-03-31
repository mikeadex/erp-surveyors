'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw, Server } from 'lucide-react'

type ReadinessCheck = {
  key: string
  label: string
  ready: boolean
  detail: string
}

export function SystemReadinessPanel({
  checks,
  productionReady,
  metrics,
}: {
  checks: ReadinessCheck[]
  productionReady: boolean
  metrics: {
    overdueCases: number
    overdueInvoices: number
    reportsInReview: number
    pendingUploads: number
  }
}) {
  const [runningSync, setRunningSync] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function runOverdueSync() {
    setRunningSync(true)
    setSyncMsg(null)
    setSyncError(null)

    try {
      const res = await fetch('/api/v1/admin/system/overdue-sync', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncError(json?.error?.message ?? 'Could not run overdue sync.')
        return
      }

      setSyncMsg(
        `Overdue sync complete: ${json.data.updatedCases} cases and ${json.data.updatedInvoices} invoices checked.`,
      )
    } catch {
      setSyncError('Could not run overdue sync right now.')
    } finally {
      setRunningSync(false)
    }
  }

  return (
    <section className="surface-card rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            System Readiness
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Deployment and admin controls
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Check the core runtime dependencies, watch key operational queues, and trigger an overdue sync without leaving settings.
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
          productionReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {productionReady ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {productionReady ? 'Core deployment ready' : 'Configuration still needed'}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Reports In Review</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{metrics.reportsInReview}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Overdue Cases</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{metrics.overdueCases}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Overdue Invoices</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{metrics.overdueInvoices}</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Pending Uploads</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{metrics.pendingUploads}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.key}
              className={`rounded-[22px] border px-4 py-3 ${
                check.ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{check.detail}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  check.ready ? 'bg-white text-emerald-700' : 'bg-white text-amber-700'
                }`}>
                  {check.ready ? 'Ready' : 'Missing'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Server className="h-4 w-4 text-brand-700" />
            <h3 className="text-sm font-semibold">Admin Actions</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Run the overdue workflow sync on demand after a deployment, backfill, or billing catch-up.
          </p>

          <button
            type="button"
            onClick={() => void runOverdueSync()}
            disabled={runningSync}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {runningSync ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Run Overdue Sync
          </button>

          {syncMsg ? (
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {syncMsg}
            </p>
          ) : null}
          {syncError ? (
            <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {syncError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
