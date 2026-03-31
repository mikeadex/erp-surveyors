'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@valuation-os/utils'

const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'

interface EligibleCaseOption {
  id: string
  reference: string
  stage: string
  client: {
    id: string
    name: string
  }
}

const CreateInvoiceFormSchema = z.object({
  caseId: z.string().optional(),
  amount: z.coerce.number().positive('Enter a valid amount.'),
  currency: z.string().length(3),
  taxRate: z.union([z.literal(''), z.coerce.number().min(0).max(1)]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
})
type InvoiceFormValues = z.infer<typeof CreateInvoiceFormSchema>

export function InvoiceForm({
  mode,
  eligibleCases = [],
  initial,
  onCancel,
}: {
  mode: 'create' | 'edit'
  eligibleCases?: EligibleCaseOption[]
  initial?: {
    id: string
    invoiceNumber: string
    caseId: string
    clientId: string
    clientName: string
    amount: string
    currency: string
    taxRate: string | null
    dueDate: string | null
    notes: string | null
  }
  onCancel: () => void
}) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const defaultValues: Partial<InvoiceFormValues> = {
    currency: initial?.currency ?? 'NGN',
    taxRate: initial?.taxRate ? Number(initial.taxRate) : '',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
    notes: initial?.notes ?? '',
  }

  if (mode === 'create') {
    defaultValues.caseId = ''
  } else if (initial?.caseId) {
    defaultValues.caseId = initial.caseId
  }

  if (initial) {
    defaultValues.amount = Number(initial.amount)
  }

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(CreateInvoiceFormSchema),
    defaultValues,
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const watchedCaseId = watch('caseId') ?? initial?.caseId
  const watchedAmount = watch('amount')
  const watchedTaxRate = watch('taxRate')

  const selectedCase = useMemo(
    () => eligibleCases.find((option) => option.id === watchedCaseId),
    [eligibleCases, watchedCaseId],
  )

  const numericAmount = typeof watchedAmount === 'number' && Number.isFinite(watchedAmount) ? watchedAmount : 0
  const numericTaxRate =
    watchedTaxRate === '' || watchedTaxRate === undefined || watchedTaxRate === null
      ? 0
      : Number(watchedTaxRate)
  const totalAmount = numericAmount + numericAmount * numericTaxRate

  async function onSubmit(values: InvoiceFormValues) {
    setErrorMsg(null)

    const payload =
      mode === 'create'
        ? {
            caseId: values.caseId,
            clientId: selectedCase?.client.id,
            amount: Number(values.amount),
            currency: values.currency,
            taxRate: values.taxRate === '' ? undefined : Number(values.taxRate),
            dueDate: values.dueDate ? new Date(`${values.dueDate}T00:00:00`).toISOString() : undefined,
            notes: values.notes?.trim() ? values.notes.trim() : undefined,
          }
        : {
            amount: Number(values.amount),
            currency: values.currency,
            taxRate: values.taxRate === '' ? null : Number(values.taxRate),
            dueDate: values.dueDate ? new Date(`${values.dueDate}T00:00:00`).toISOString() : null,
            notes: values.notes?.trim() ? values.notes.trim() : null,
          }

    if (mode === 'create' && !selectedCase?.client.id) {
      setErrorMsg('Select a case with a linked client before creating the invoice.')
      return
    }
    if (mode === 'create' && !values.caseId) {
      setErrorMsg('Select a case to invoice before creating the draft.')
      return
    }

    const endpoint = mode === 'create' ? '/api/v1/invoices' : `/api/v1/invoices/${initial?.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? `Failed to ${mode} invoice`)
      return
    }

    if (mode === 'create') {
      router.push(`/invoices/${json.data.id}`)
    } else {
      router.refresh()
      onCancel()
    }
  }

  return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {mode === 'create' ? 'Invoice Scope' : 'Draft Invoice'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {mode === 'create'
              ? 'Choose a completed case and turn it into a finance record without leaving the desk.'
              : 'Adjust the commercial details while the invoice is still in draft.'}
          </p>
        </div>

        {mode === 'create' ? (
          <div>
            <label htmlFor="caseId" className={labelClassName}>
              Case <span className="text-red-500">*</span>
            </label>
            <select id="caseId" {...register('caseId')} className={inputClassName}>
              <option value="">Select a completed case…</option>
              {eligibleCases.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.reference} · {option.client.name} · {option.stage.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            {errors.caseId && <p className="mt-1 text-xs text-red-600">{errors.caseId.message}</p>}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] bg-white px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Invoice</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{initial?.invoiceNumber}</p>
            </div>
            <div className="rounded-[22px] bg-white px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Client</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{initial?.clientName}</p>
            </div>
          </div>
        )}

        {mode === 'create' && selectedCase ? (
          <div className="rounded-[22px] bg-white px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Billed Client</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCase.client.name}</p>
          </div>
        ) : null}
      </section>

      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Charges And Terms</h2>
          <p className="mt-1 text-xs text-slate-500">
            Set the subtotal, tax treatment, and payment timing for this invoice.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="amount" className={labelClassName}>
              Amount <span className="text-red-500">*</span>
            </label>
            <input id="amount" type="number" min={0} step={0.01} {...register('amount')} className={inputClassName} />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>

          <div>
            <label htmlFor="currency" className={labelClassName}>
              Currency <span className="text-red-500">*</span>
            </label>
            <input id="currency" maxLength={3} {...register('currency')} className={inputClassName} />
            {errors.currency && <p className="mt-1 text-xs text-red-600">{errors.currency.message}</p>}
          </div>

          <div>
            <label htmlFor="taxRate" className={labelClassName}>
              Tax Rate
            </label>
            <input
              id="taxRate"
              type="number"
              min={0}
              max={1}
              step={0.01}
              {...register('taxRate')}
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-slate-500">Enter as a decimal, for example `0.075` for 7.5%.</p>
          </div>

          <div>
            <label htmlFor="dueDate" className={labelClassName}>
              Due Date
            </label>
            <input id="dueDate" type="date" {...register('dueDate')} className={inputClassName} />
          </div>
        </div>

        <div className="rounded-[22px] border border-brand-100 bg-brand-50/60 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-700">Estimated Total</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatCurrency(totalAmount || 0, watch('currency') || 'NGN')}
          </p>
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <p className="mt-1 text-xs text-slate-500">
            Add collection context, payment instructions, or internal finance notes.
          </p>
        </div>

        <div>
          <label htmlFor="notes" className={labelClassName}>
            Notes
          </label>
          <textarea id="notes" rows={5} {...register('notes')} className={inputClassName} />
          {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>}
        </div>
      </section>

      {errorMsg ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMsg}</p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (mode === 'create' && eligibleCases.length === 0)}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'create' ? 'Create Invoice' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
