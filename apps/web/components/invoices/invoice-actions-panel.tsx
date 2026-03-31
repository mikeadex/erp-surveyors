'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, Loader2, SendHorizonal } from 'lucide-react'
import type { UserRole } from '@valuation-os/types'

const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60'

const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60'

export function InvoiceActionsPanel({
  invoiceId,
  invoiceNumber,
  status,
  currentRole,
}: {
  invoiceId: string
  invoiceNumber: string
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void'
  currentRole: UserRole
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canIssue = ['managing_partner', 'finance'].includes(currentRole) && status === 'draft'
  const canMarkPaid = ['managing_partner', 'finance'].includes(currentRole) && ['sent', 'partial', 'overdue'].includes(status)
  const canVoid = currentRole === 'managing_partner' && ['draft', 'sent'].includes(status)

  async function runAction(endpoint: string) {
    setErrorMsg(null)
    const res = await fetch(endpoint, { method: 'POST' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Invoice action failed')
      return
    }

    startTransition(() => router.refresh())
  }

  return (
    <section className="surface-card rounded-[28px] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Finance Actions
          </p>
          <h2 className="text-lg font-semibold text-slate-950">{invoiceNumber}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Issue draft invoices, confirm payment collection, or void records that should not remain active.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canIssue ? (
            <button
              type="button"
              onClick={() => runAction(`/api/v1/invoices/${invoiceId}/issue`)}
              disabled={isPending}
              className={primaryButtonClassName}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              Issue Invoice
            </button>
          ) : null}

          {canMarkPaid ? (
            <button
              type="button"
              onClick={() => runAction(`/api/v1/invoices/${invoiceId}/mark-paid`)}
              disabled={isPending}
              className={primaryButtonClassName}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark Paid
            </button>
          ) : null}

          {canVoid ? (
            <button
              type="button"
              onClick={() => runAction(`/api/v1/invoices/${invoiceId}/void`)}
              disabled={isPending}
              className={secondaryButtonClassName}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Void Invoice
            </button>
          ) : null}
        </div>
      </div>

      {errorMsg ? (
        <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      ) : null}
    </section>
  )
}
