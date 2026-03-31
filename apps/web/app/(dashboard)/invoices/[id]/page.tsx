import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { formatDate, formatCurrency } from '@valuation-os/utils'
import Link from 'next/link'
import { InvoiceActionsPanel } from '@/components/invoices/invoice-actions-panel'
import { EditInvoiceModalTrigger } from '@/components/invoices/edit-invoice-modal-trigger'

const STATUS_COLORS: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-600',
  sent:    'bg-blue-50 text-blue-700',
  paid:    'bg-green-50 text-green-700',
  partial: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-50 text-red-700',
  void:    'bg-gray-100 text-gray-400',
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
      <div className="p-6 max-w-3xl space-y-6">
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
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${STATUS_COLORS[invoice.status] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {invoice.status}
          </span>
          <span className="font-mono text-sm text-gray-500">{invoice.invoiceNumber}</span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Financial details */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Amount</h2>
            <dl className="space-y-3 text-sm divide-y divide-gray-100">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(invoice.amount.toString(), invoice.currency)}
                </dd>
              </div>
              {invoice.taxRate && (
                <div className="flex justify-between pt-3">
                  <dt className="text-gray-500">
                    Tax ({(Number(invoice.taxRate) * 100).toFixed(0)}%)
                  </dt>
                  <dd className="text-gray-700">
                    {formatCurrency((invoice.taxAmount ?? 0).toString(), invoice.currency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between pt-3">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="text-lg font-bold text-gray-900">
                  {formatCurrency(invoice.totalAmount.toString(), invoice.currency)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Dates */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Dates</h2>
            <dl className="space-y-3 text-sm divide-y divide-gray-100">
              <div className="flex justify-between">
                <dt className="text-gray-500">Issued</dt>
                <dd className="text-gray-700">{formatDate(invoice.createdAt)}</dd>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between pt-3">
                  <dt className="text-gray-500">Due</dt>
                  <dd className="text-gray-700">{formatDate(invoice.dueDate)}</dd>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between pt-3">
                  <dt className="text-gray-500">Paid</dt>
                  <dd className="font-medium text-green-700">{formatDate(invoice.paidAt)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        {/* Case + Client */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Case</h2>
            <Link href={`/cases/${invoice.case.id}`} className="text-sm font-medium text-blue-600 hover:underline">
              {invoice.case.reference}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              {invoice.case.valuationType} · {invoice.case.stage.replace(/_/g, ' ')}
            </p>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Client</h2>
            <Link href={`/clients/${invoice.client.id}`} className="text-sm font-medium text-blue-600 hover:underline">
              {invoice.client.name}
            </Link>
            {invoice.client.email && (
              <p className="text-xs text-gray-500 mt-0.5">{invoice.client.email}</p>
            )}
            {invoice.client.phone && (
              <p className="text-xs text-gray-500">{invoice.client.phone}</p>
            )}
          </section>
        </div>

        {invoice.notes && (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </section>
        )}

        <p className="text-xs text-gray-400">
          {formatDate(invoice.createdAt)}
        </p>
      </div>
    </>
  )
}
