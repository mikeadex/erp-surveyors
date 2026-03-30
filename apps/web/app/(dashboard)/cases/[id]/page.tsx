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
import { assertRecordBranchAccess } from '@/lib/auth/branch-scope'
import { CaseNotesPanel } from '@/components/cases/case-notes-panel'
import { CaseChecklistPanel } from '@/components/cases/case-checklist-panel'
import { InspectionMediaGallery } from '@/components/inspections/inspection-media-gallery'
import { hasMediaReadConfig } from '@/lib/storage/s3'
import { sanitizeRichTextHtml } from '@/lib/editor/rich-text'

function describeActivity(
  activity: {
    action: string
    before: unknown
    after: unknown
  },
) {
  if (activity.action === 'CASE_STAGE_CHANGED') {
    const fromStage = typeof activity.after === 'object' && activity.after && 'from' in activity.after
      ? String((activity.after as Record<string, unknown>).from ?? '')
      : ''
    const toStage = typeof activity.after === 'object' && activity.after && 'to' in activity.after
      ? String((activity.after as Record<string, unknown>).to ?? '')
      : ''
    return `Stage changed from ${getCaseStageLabel(fromStage as CaseStage)} to ${getCaseStageLabel(toStage as CaseStage)}`
  }

  if (activity.action === 'CASE_NOTE_ADDED') {
    return 'Internal note added'
  }

  if (activity.action === 'CASE_CREATED') {
    return 'Case created'
  }

  if (activity.action === 'CASE_UPDATED') {
    return 'Case details updated'
  }

  if (activity.action === 'CASE_INSPECTION_CREATED') {
    return 'Inspection draft created'
  }

  if (activity.action === 'CASE_INSPECTION_UPDATED') {
    return 'Inspection details updated'
  }

  if (activity.action === 'CASE_INSPECTION_SUBMITTED') {
    return 'Inspection submitted for downstream review'
  }

  if (activity.action === 'CASE_INSPECTION_MEDIA_ADDED') {
    return 'Inspection photo added'
  }

  if (activity.action === 'CASE_INSPECTION_MEDIA_DELETED') {
    return 'Inspection photo removed'
  }

  if (activity.action === 'CASE_CHECKLIST_ITEM_ADDED') {
    const label = typeof activity.after === 'object' && activity.after && 'label' in activity.after
      ? String((activity.after as Record<string, unknown>).label ?? '')
      : 'Checklist item'
    return `Checklist item added: ${label}`
  }

  if (activity.action === 'CASE_CHECKLIST_ITEM_UPDATED') {
    const label = typeof activity.after === 'object' && activity.after && 'label' in activity.after
      ? String((activity.after as Record<string, unknown>).label ?? '')
      : 'Checklist item'
    const isChecked = typeof activity.after === 'object' && activity.after && 'isChecked' in activity.after
      ? Boolean((activity.after as Record<string, unknown>).isChecked)
      : false
    return `${label} marked ${isChecked ? 'complete' : 'incomplete'}`
  }

  if (activity.action === 'CASE_CHECKLIST_ITEM_DELETED') {
    const label = typeof activity.before === 'object' && activity.before && 'label' in activity.before
      ? String((activity.before as Record<string, unknown>).label ?? '')
      : 'Checklist item'
    return `Checklist item removed: ${label}`
  }

  return activity.action
}

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
  try {
    assertRecordBranchAccess(session, caseRecord.branchId, 'case')
  } catch {
    notFound()
  }

  const [checklistItems, activityItems] = await Promise.all([
    prisma.caseChecklistItem.findMany({
      where: { caseId: id },
      orderBy: [{ isChecked: 'asc' }, { label: 'asc' }],
      select: { id: true, label: true, isChecked: true, checkedAt: true },
    }),
    prisma.auditLog.findMany({
      where: {
        firmId: session.firmId,
        entityType: 'Case',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        before: true,
        after: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ])

  const canManage = ['managing_partner', 'admin'].includes(session.role)
  const mediaConfigured = hasMediaReadConfig()

  return (
    <>
      <Header user={user} title={caseRecord.reference} />
      <div className="space-y-5 px-4 pb-6 lg:px-6">

        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Case Workbench
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Keep this instruction moving from inspection through review and billing.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review core case facts, team activity, checklist progress, and inspection readiness in one place.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <StageBadge stage={caseRecord.stage as CaseStage} />
                {caseRecord.isOverdue && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/cases/${id}/inspection`}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Inspection Workspace
              </Link>
              <StageTransitionButton caseId={id} currentStage={caseRecord.stage as CaseStage} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left column: main info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Case details card */}
            <section className="surface-card rounded-[28px] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Case Details</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="font-mono font-medium text-slate-900">{caseRecord.reference}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Valuation Type</dt>
                  <dd className="capitalize text-slate-900">
                    {caseRecord.valuationType.replace('_', ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Stage</dt>
                  <dd className="text-slate-900">{getCaseStageLabel(caseRecord.stage as CaseStage)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Due Date</dt>
                  <dd className={`text-slate-900 ${caseRecord.isOverdue ? 'font-semibold text-red-600' : ''}`}>
                    {caseRecord.dueDate ? formatDate(caseRecord.dueDate) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Fee Amount</dt>
                  <dd className="text-slate-900">
                    {caseRecord.feeAmount
                      ? formatCurrency(caseRecord.feeAmount.toString(), caseRecord.feeCurrency)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-slate-900">{formatDate(caseRecord.createdAt)}</dd>
                </div>
              </dl>
            </section>

            <CaseNotesPanel caseId={id} initialNotes={caseRecord.internalNotes} />

            <CaseChecklistPanel
              caseId={id}
              items={checklistItems.map((item) => ({
                id: item.id,
                label: item.label,
                isChecked: item.isChecked,
                checkedAt: item.checkedAt,
              }))}
            />

            {/* Property card */}
            {caseRecord.property && (
              <section className="surface-card rounded-[28px] p-5 space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Property
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="col-span-2">
                    <dt className="text-slate-500">Address</dt>
                    <dd className="text-slate-900">{caseRecord.property.address}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">City / LGA</dt>
                    <dd className="text-slate-900">
                      {[caseRecord.property.city, caseRecord.property.localGovernment]
                        .filter(Boolean)
                        .join(' / ') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">State</dt>
                    <dd className="text-slate-900">{caseRecord.property.state}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Property Use</dt>
                    <dd className="capitalize text-slate-900">
                      {caseRecord.property.propertyUse.replace('_', ' ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tenure</dt>
                    <dd className="capitalize text-slate-900">
                      {caseRecord.property.tenureType.replace(/_/g, ' ')}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Inspection card */}
            {caseRecord.inspection && (
              <section className="surface-card rounded-[28px] p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Inspection</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Field summary, photo coverage, and submission status.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                      caseRecord.inspection.status === 'submitted'
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {caseRecord.inspection.status}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Inspector</dt>
                    <dd className="text-slate-900">
                      {caseRecord.inspection.inspector.firstName}{' '}
                      {caseRecord.inspection.inspector.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Inspection Date</dt>
                    <dd className="text-slate-900">
                      {caseRecord.inspection.inspectionDate
                        ? formatDate(caseRecord.inspection.inspectionDate)
                        : '—'}
                    </dd>
                  </div>
                  {caseRecord.inspection.conditionSummary && (
                    <div className="col-span-2">
                      <dt className="text-slate-500">Condition Summary</dt>
                      <dd
                        className="prose prose-sm mt-1 max-w-none text-slate-700 prose-headings:mb-2 prose-headings:text-slate-900 prose-p:leading-6"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(caseRecord.inspection.conditionSummary) }}
                      />
                    </div>
                  )}
                </dl>
                <div className="rounded-[22px] bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Photo Register
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {caseRecord.inspection.media.length} linked photo{caseRecord.inspection.media.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Link
                      href={`/cases/${id}/inspection`}
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Workspace
                    </Link>
                  </div>
                  <InspectionMediaGallery
                    items={caseRecord.inspection.media}
                    configured={mediaConfigured}
                    emptyCopy="No inspection photos attached yet."
                  />
                </div>
              </section>
            )}

            {/* Documents */}
            {caseRecord.documents.length > 0 && (
              <section className="surface-card rounded-[28px] p-5 space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Documents ({caseRecord.documents.length})
                </h2>
                <ul className="divide-y divide-slate-100">
                  {caseRecord.documents.map((d: { id: string; name: string; s3Key: string; createdAt: Date }) => (
                    <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="truncate text-slate-900">{d.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-400">
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
            <section className="surface-card rounded-[28px] p-5 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <User className="h-4 w-4 text-slate-400" />
                Client
              </h2>
              <div>
                <Link
                  href={`/clients/${caseRecord.client.id}`}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  {caseRecord.client.name}
                </Link>
                <p className="mt-0.5 text-xs capitalize text-slate-400">{caseRecord.client.type}</p>
              </div>
              {caseRecord.client.email && (
                <p className="text-sm text-slate-700">{caseRecord.client.email}</p>
              )}
              {caseRecord.client.phone && (
                <p className="text-sm text-slate-700">{caseRecord.client.phone}</p>
              )}
            </section>

            {/* Team */}
            <section className="surface-card rounded-[28px] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Team</h2>
              {caseRecord.assignedValuer && (
                <div>
                  <p className="text-xs text-slate-500">Valuer</p>
                  <p className="text-sm font-medium text-slate-900">
                    {caseRecord.assignedValuer.firstName} {caseRecord.assignedValuer.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[caseRecord.assignedValuer.role as keyof typeof ROLE_LABELS]}
                  </p>
                </div>
              )}
              {caseRecord.assignedReviewer && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">Reviewer</p>
                  <p className="text-sm font-medium text-slate-900">
                    {caseRecord.assignedReviewer.firstName} {caseRecord.assignedReviewer.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[caseRecord.assignedReviewer.role as keyof typeof ROLE_LABELS]}
                  </p>
                </div>
              )}
            </section>

            {/* Invoice */}
            {caseRecord.invoice && (
              <section className="surface-card rounded-[28px] p-5 space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Invoice
                </h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Number</dt>
                    <dd className="font-mono font-medium">{caseRecord.invoice.invoiceNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Amount</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(caseRecord.invoice.totalAmount.toString())}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Status</dt>
                    <dd className="capitalize font-medium">{caseRecord.invoice.status}</dd>
                  </div>
                  {caseRecord.invoice.dueDate && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Due</dt>
                      <dd>{formatDate(caseRecord.invoice.dueDate)}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Admin actions */}
            {canManage && (
              <section className="surface-card rounded-[28px] p-5 space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </h2>
                <button className="w-full text-left text-sm text-red-600 hover:text-red-800 py-1">
                  Archive case
                </button>
              </section>
            )}

            <section className="surface-card rounded-[28px] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
              {activityItems.length === 0 ? (
                <p className="text-sm text-slate-400">No recorded activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activityItems.map((activity) => {
                    const actor = `${activity.user.firstName} ${activity.user.lastName}`.trim()
                    const summary = describeActivity(activity)

                    return (
                      <div key={activity.id} className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{summary}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {actor || 'Unknown user'} · {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
