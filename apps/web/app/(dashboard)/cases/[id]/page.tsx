import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { StageBadge } from '@/components/cases/stage-badge'
import { StageTransitionButton } from '@/components/cases/stage-transition-button'
import { formatDate, formatCurrency, getCaseStageLabel, ROLE_LABELS } from '@valuation-os/utils'
import { AlertTriangle, Calendar, FileText, User, Building2 } from 'lucide-react'
import Link from 'next/link'
import type { CaseStage } from '@valuation-os/types'

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, caseRecord] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.case.findFirst({
      where: { id, firmId: session.firmId },
      include: {
        client: { select: { id: true, name: true, type: true, email: true, phone: true } },
        property: true,
        assignedValuer: { select: { id: true, firstName: true, lastName: true, role: true } },
        assignedReviewer: { select: { id: true, firstName: true, lastName: true, role: true } },
        inspection: {
          select: {
            id: true, status: true, inspectionDate: true, submittedAt: true,
            conditionSummary: true, notes: true,
            inspector: { select: { id: true, firstName: true, lastName: true } },
            media: { select: { id: true, s3Key: true, caption: true }, take: 8 },
          },
        },
        documents: {
          where: { deletedAt: null },
          select: { id: true, name: true, s3Key: true, mimeType: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        invoice: {
          select: {
            id: true, invoiceNumber: true, status: true,
            totalAmount: true, dueDate: true, paidAt: true,
          },
        },
      },
    }),
  ])

  if (!user) redirect('/login')
  if (!caseRecord) notFound()

  const canManage = ['managing_partner', 'admin'].includes(session.role)

  return (
    <>
      <Header user={user} title={caseRecord.reference} />
      <div className="p-6 space-y-6 max-w-6xl">

        {/* Top row: stage + actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StageBadge stage={caseRecord.stage as CaseStage} />
            {caseRecord.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </span>
            )}
          </div>
          <StageTransitionButton caseId={id} currentStage={caseRecord.stage as CaseStage} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left column: main info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Case details card */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Case Details</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Reference</dt>
                  <dd className="font-mono font-medium text-gray-900">{caseRecord.reference}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Valuation Type</dt>
                  <dd className="capitalize text-gray-900">
                    {caseRecord.valuationType.replace('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Stage</dt>
                  <dd className="text-gray-900">{getCaseStageLabel(caseRecord.stage as CaseStage)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Due Date</dt>
                  <dd className={`text-gray-900 ${caseRecord.isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                    {caseRecord.dueDate ? formatDate(caseRecord.dueDate) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fee Amount</dt>
                  <dd className="text-gray-900">
                    {caseRecord.feeAmount
                      ? formatCurrency(caseRecord.feeAmount.toString(), caseRecord.feeCurrency)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">{formatDate(caseRecord.createdAt)}</dd>
                </div>
              </dl>
              {caseRecord.internalNotes && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Internal Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {caseRecord.internalNotes}
                  </p>
                </div>
              )}
            </section>

            {/* Property card */}
            {caseRecord.property && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  Property
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="col-span-2">
                    <dt className="text-gray-500">Address</dt>
                    <dd className="text-gray-900">{caseRecord.property.address}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">City / LGA</dt>
                    <dd className="text-gray-900">
                      {[caseRecord.property.city, caseRecord.property.localGovernment]
                        .filter(Boolean)
                        .join(' / ') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">State</dt>
                    <dd className="text-gray-900">{caseRecord.property.state}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Property Use</dt>
                    <dd className="capitalize text-gray-900">
                      {caseRecord.property.propertyUse.replace('_', ' ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Tenure</dt>
                    <dd className="capitalize text-gray-900">
                      {caseRecord.property.tenureType.replace(/_/g, ' ')}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Inspection card */}
            {caseRecord.inspection && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Inspection</h2>
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      caseRecord.inspection.status === 'submitted'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {caseRecord.inspection.status}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Inspector</dt>
                    <dd className="text-gray-900">
                      {caseRecord.inspection.inspector.firstName}{' '}
                      {caseRecord.inspection.inspector.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Inspection Date</dt>
                    <dd className="text-gray-900">
                      {caseRecord.inspection.inspectionDate
                        ? formatDate(caseRecord.inspection.inspectionDate)
                        : '—'}
                    </dd>
                  </div>
                  {caseRecord.inspection.conditionSummary && (
                    <div className="col-span-2">
                      <dt className="text-gray-500">Condition Summary</dt>
                      <dd className="text-gray-900 whitespace-pre-wrap">
                        {caseRecord.inspection.conditionSummary}
                      </dd>
                    </div>
                  )}
                </dl>
                {caseRecord.inspection.media.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 mb-2">Photos ({caseRecord.inspection.media.length})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {caseRecord.inspection.media.map((m: { id: string; s3Key: string; caption: string | null }) => (
                        <div
                          key={m.id}
                          className="aspect-square rounded-lg bg-gray-100 overflow-hidden"
                        >
                          <img
                            src={`/api/v1/media/${m.s3Key}`}
                            alt={m.caption ?? ''}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Documents */}
            {caseRecord.documents.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Documents ({caseRecord.documents.length})
                </h2>
                <ul className="divide-y divide-gray-100">
                  {caseRecord.documents.map((d: { id: string; name: string; s3Key: string; createdAt: Date }) => (
                    <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-gray-900 truncate">{d.name}</span>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatDate(d.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right column: sidebar info */}
          <div className="space-y-6">

            {/* Client */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                Client
              </h2>
              <div>
                <Link
                  href={`/clients/${caseRecord.client.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {caseRecord.client.name}
                </Link>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{caseRecord.client.type}</p>
              </div>
              {caseRecord.client.email && (
                <p className="text-sm text-gray-700">{caseRecord.client.email}</p>
              )}
              {caseRecord.client.phone && (
                <p className="text-sm text-gray-700">{caseRecord.client.phone}</p>
              )}
            </section>

            {/* Team */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Team</h2>
              {caseRecord.assignedValuer && (
                <div>
                  <p className="text-xs text-gray-500">Valuer</p>
                  <p className="text-sm font-medium text-gray-900">
                    {caseRecord.assignedValuer.firstName} {caseRecord.assignedValuer.lastName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ROLE_LABELS[caseRecord.assignedValuer.role as keyof typeof ROLE_LABELS]}
                  </p>
                </div>
              )}
              {caseRecord.assignedReviewer && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">Reviewer</p>
                  <p className="text-sm font-medium text-gray-900">
                    {caseRecord.assignedReviewer.firstName} {caseRecord.assignedReviewer.lastName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ROLE_LABELS[caseRecord.assignedReviewer.role as keyof typeof ROLE_LABELS]}
                  </p>
                </div>
              )}
            </section>

            {/* Invoice */}
            {caseRecord.invoice && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Invoice
                </h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Number</dt>
                    <dd className="font-mono font-medium">{caseRecord.invoice.invoiceNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Amount</dt>
                    <dd className="font-semibold text-gray-900">
                      {formatCurrency(caseRecord.invoice.totalAmount.toString())}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status</dt>
                    <dd className="capitalize font-medium">{caseRecord.invoice.status}</dd>
                  </div>
                  {caseRecord.invoice.dueDate && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Due</dt>
                      <dd>{formatDate(caseRecord.invoice.dueDate)}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Admin actions */}
            {canManage && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </h2>
                <button className="w-full text-left text-sm text-red-600 hover:text-red-800 py-1">
                  Archive case
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
