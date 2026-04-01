import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowRight, CircleDollarSign, ReceiptText } from 'lucide-react'
import { formatCurrency, formatDate } from '@valuation-os/utils'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { InvoiceActionsPanel } from '@/components/invoices/invoice-actions-panel'
import { EditInvoiceModalTrigger } from '@/components/invoices/edit-invoice-modal-trigger'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-brand-50 text-brand-700',
  paid: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
  void: 'bg-slate-100 text-slate-400',
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  if (!['managing_partner', 'finance'].includes(session.role)) redirect('/dashboard')

  const [user, invoice] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.invoice.findFirst({
      where: { id, firmId: session.firmId },
      include: {
        case: { select: { id: true, reference: true, stage: true, valuationType: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
  ])

  if (!user) redirect('/login')
  if (!invoice) notFound()

  return (
    <>
      <Header user={user} title={invoice.invoiceNumber} />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Finance Record
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Track commercial terms, due dates, payment status, and case linkage from one invoice view.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use this view to issue, settle, or void the invoice while keeping the downstream case stage aligned.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-950">{invoice.status}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Total
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {formatCurrency(invoice.totalAmount.toString(), invoice.currency)}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Due
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <InvoiceActionsPanel
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          status={invoice.status}
          currentRole={user.role}
        />

        {invoice.status === 'draft' ? (
          <div className="flex justify-end">
            <EditInvoiceModalTrigger
              invoice={{
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                caseId: invoice.case.id,
                clientId: invoice.client.id,
                clientName: invoice.client.name,
                amount: invoice.amount.toString(),
                currency: invoice.currency,
                taxRate: invoice.taxRate?.toString() ?? null,
                dueDate: invoice.dueDate?.toISOString() ?? null,
                notes: invoice.notes ?? null,
              }}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${STATUS_COLORS[invoice.status] ?? 'bg-slate-100 text-slate-700'}`}
          >
            {invoice.status}
          </span>
          <span className="font-mono text-sm text-slate-500">{invoice.invoiceNumber}</span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section className="surface-card rounded-[28px] p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Amount</h2>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Financial details</p>
              </div>
            </div>
            <dl className="space-y-3 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium text-slate-900">
                  {formatCurrency(invoice.amount.toString(), invoice.currency)}
                </dd>
              </div>
              {invoice.taxRate ? (
                <div className="flex justify-between pt-3">
                  <dt className="text-slate-500">
                    Tax ({(Number(invoice.taxRate) * 100).toFixed(0)}%)
                  </dt>
                  <dd className="text-slate-700">
                    {formatCurrency((invoice.taxAmount ?? 0).toString(), invoice.currency)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between pt-3">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="text-lg font-bold text-slate-950">
                  {formatCurrency(invoice.totalAmount.toString(), invoice.currency)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="surface-card rounded-[28px] p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Dates</h2>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Timeline</p>
              </div>
            </div>
            <dl className="space-y-3 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Issued</dt>
                <dd className="text-slate-700">{formatDate(invoice.createdAt)}</dd>
              </div>
              {invoice.dueDate ? (
                <div className="flex justify-between pt-3">
                  <dt className="text-slate-500">Due</dt>
                  <dd className="text-slate-700">{formatDate(invoice.dueDate)}</dd>
                </div>
              ) : null}
              {invoice.paidAt ? (
                <div className="flex justify-between pt-3">
                  <dt className="text-slate-500">Paid</dt>
                  <dd className="font-medium text-emerald-700">{formatDate(invoice.paidAt)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section className="surface-card rounded-[28px] p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Case</h2>
            <Link href={`/cases/${invoice.case.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
              {invoice.case.reference}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="mt-0.5 text-xs capitalize text-slate-500">
              {invoice.case.valuationType} · {invoice.case.stage.replace(/_/g, ' ')}
            </p>
          </section>

          <section className="surface-card rounded-[28px] p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Client</h2>
            <Link href={`/clients/${invoice.client.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
              {invoice.client.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {invoice.client.email ? (
              <p className="mt-0.5 text-xs text-slate-500">{invoice.client.email}</p>
            ) : null}
            {invoice.client.phone ? (
              <p className="text-xs text-slate-500">{invoice.client.phone}</p>
            ) : null}
          </section>
        </div>

        {invoice.notes ? (
          <section className="surface-card rounded-[28px] p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{invoice.notes}</p>
          </section>
        ) : null}

        <p className="text-xs text-slate-400">{formatDate(invoice.createdAt)}</p>
      </div>
    </>
  )
}
