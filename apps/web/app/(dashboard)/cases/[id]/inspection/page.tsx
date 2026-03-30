import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { InspectionForm } from '@/components/inspections/inspection-form'
import Link from 'next/link'
import { ArrowLeft, Camera, ClipboardCheck, MapPin } from 'lucide-react'
import { assertRecordBranchAccess } from '@/lib/auth/branch-scope'
import { InspectionMediaGallery } from '@/components/inspections/inspection-media-gallery'
import { hasMediaReadConfig, hasSignedStorageConfig } from '@/lib/storage/s3'
import { InspectionMediaManager } from '@/components/inspections/inspection-media-manager'
import { richTextToPlainText } from '@/lib/editor/rich-text'
import { getInspectionSubmissionIssues } from '@valuation-os/utils'

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params

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
      where: { id: caseId, firmId: session.firmId },
      select: {
        id: true, reference: true, stage: true, branchId: true,
        property: { select: { address: true, city: true, state: true } },
        inspection: {
          select: {
            id: true,
            status: true,
            inspectionDate: true,
            occupancy: true,
            locationDescription: true,
            externalCondition: true,
            internalCondition: true,
            services: true,
            conditionSummary: true,
            notes: true,
            media: {
              select: { id: true, s3Key: true, caption: true },
              orderBy: [{ sortOrder: 'asc' }, { takenAt: 'asc' }],
            },
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

  const mediaConfigured = hasMediaReadConfig()
  const uploadConfigured = hasSignedStorageConfig()
  const inspectionSummary = caseRecord.inspection
    ? richTextToPlainText(caseRecord.inspection.conditionSummary).trim()
    : ''
  const inspectionNotes = caseRecord.inspection
    ? richTextToPlainText(caseRecord.inspection.notes).trim()
    : ''
  const readinessIssues = caseRecord.inspection
    ? getInspectionSubmissionIssues({
        inspectionDate: caseRecord.inspection.inspectionDate,
        occupancy: caseRecord.inspection.occupancy,
        locationDescription: caseRecord.inspection.locationDescription,
        externalCondition: caseRecord.inspection.externalCondition,
        internalCondition: caseRecord.inspection.internalCondition,
        services: caseRecord.inspection.services,
        conditionSummary: caseRecord.inspection.conditionSummary,
        mediaCount: caseRecord.inspection.media.length,
      })
    : []
  const handoffItems = [
    {
      label: 'Inspection status',
      ready: caseRecord.inspection?.status === 'submitted',
      detail: caseRecord.inspection?.status === 'submitted' ? 'Submitted for review' : 'Still in draft',
    },
    {
      label: 'Submission readiness',
      ready: readinessIssues.length === 0 && Boolean(caseRecord.inspection),
      detail:
        readinessIssues.length === 0
          ? 'All required submission checks are covered.'
          : `${readinessIssues.length} required item${readinessIssues.length === 1 ? '' : 's'} still missing.`,
    },
    {
      label: 'Condition summary',
      ready: Boolean(inspectionSummary),
      detail: inspectionSummary ? 'Main inspection conclusion recorded' : 'Summary still missing',
    },
    {
      label: 'Inspector notes',
      ready: Boolean(inspectionNotes),
      detail: inspectionNotes ? 'Supporting notes captured' : 'No supporting notes yet',
    },
    {
      label: 'Photo register',
      ready: Boolean(caseRecord.inspection?.media.length),
      detail: `${caseRecord.inspection?.media.length ?? 0} linked photo${caseRecord.inspection?.media.length === 1 ? '' : 's'}`,
    },
  ]

  return (
    <>
      <Header user={user} title={`Inspection — ${caseRecord.reference}`} />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Inspection Workspace
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Capture field observations, condition notes, and submission readiness.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep the inspection readable for valuers and reviewers without leaving the case context.
              </p>
            </div>
            <Link
              href={`/cases/${caseId}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to case
            </Link>
          </div>
        </section>

        <section className="surface-card rounded-[28px] px-5 py-5 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-[24px] bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Site
              </p>
              <div className="mt-3 flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{caseRecord.property.address}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {[caseRecord.property.city, caseRecord.property.state].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[24px] bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Status
                </p>
                <p className="mt-2 text-lg font-semibold capitalize text-slate-900">
                  {caseRecord.inspection?.status ?? 'Not started'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {caseRecord.inspection?.inspectionDate
                    ? `Inspection date ${new Date(caseRecord.inspection.inspectionDate).toLocaleDateString('en-GB')}`
                    : 'No inspection date set yet'}
                </p>
              </div>

              <div className="rounded-[24px] bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Photos
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {caseRecord.inspection?.media.length ?? 0}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Existing field images linked to this inspection.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <InspectionForm
              caseId={caseId}
              inspection={caseRecord.inspection ?? null}
              currentUserId={session.userId}
            />
          </div>

          <div className="space-y-5">
            <section className="surface-card rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-400" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Photo Register</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Field images linked to this inspection appear here as soon as storage is available.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                {caseRecord.inspection ? (
                  <InspectionMediaManager
                    caseId={caseId}
                    inspectionId={caseRecord.inspection.id}
                    items={caseRecord.inspection.media}
                    configured={mediaConfigured}
                    uploadConfigured={uploadConfigured}
                    isSubmitted={caseRecord.inspection.status === 'submitted'}
                  />
                ) : (
                  <InspectionMediaGallery
                    items={[]}
                    configured={mediaConfigured}
                    emptyCopy="Save the inspection draft first before attaching photos."
                  />
                )}
              </div>
            </section>

            <section className="surface-card rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-slate-400" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Reviewer Handoff</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    A quick readiness check before the inspection moves deeper into review and reporting.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {handoffItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[22px] px-4 py-3 ${item.ready ? 'bg-brand-50/80 text-brand-900' : 'bg-slate-50/90 text-slate-700'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          item.ready ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {item.ready ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
                  </div>
                ))}
                {readinessIssues.length ? (
                  <div className="rounded-[22px] border border-amber-200 bg-amber-50/90 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900">Still needed before submit</p>
                    <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-800">
                      {readinessIssues.map((issue) => (
                        <li key={issue.key}>• {issue.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="surface-card rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-slate-400" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Workflow Notes</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Draft first, then submit once the inspection summary and supporting details are complete.
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                  Save a draft as often as needed while the inspection is still in progress.
                </li>
                <li className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                  Submitted inspections become read-only and push the case forward when it was waiting on site work.
                </li>
                <li className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                  Photo previews depend on a configured public storage URL in this environment.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
