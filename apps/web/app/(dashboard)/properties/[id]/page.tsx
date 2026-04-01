import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowRight, FolderSearch, MapPin } from 'lucide-react'
import type { CaseStage } from '@valuation-os/types'
import { formatCurrency, formatDate } from '@valuation-os/utils'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { rankComparablesForProperty } from '@/lib/properties/property-records'
import { sanitizeRichTextHtml } from '@/lib/editor/rich-text'
import { Header } from '@/components/layout/header'
import { StageBadge } from '@/components/cases/stage-badge'
import { PropertyManagementPanel } from '@/components/properties/property-management-panel'

function labelOf(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, propertyRecord, comparableCandidates, clientOptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.property.findFirst({
      where: { id, firmId: session.firmId },
      select: {
        id: true,
        firmId: true,
        clientId: true,
        client: { select: { id: true, name: true } },
        address: true,
        city: true,
        state: true,
        localGovernment: true,
        propertyUse: true,
        tenureType: true,
        plotSize: true,
        plotSizeUnit: true,
        description: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        deletedAt: true,
        cases: {
          select: {
            id: true,
            reference: true,
            stage: true,
            valuationType: true,
            isOverdue: true,
            dueDate: true,
            createdAt: true,
            client: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { cases: true } },
      },
    }),
    prisma.comparable.findMany({
      where: { firmId: session.firmId },
      select: {
        id: true,
        comparableType: true,
        address: true,
        city: true,
        state: true,
        propertyUse: true,
        tenureType: true,
        salePrice: true,
        rentalValue: true,
        transactionDate: true,
        isVerified: true,
        createdAt: true,
      },
      take: 150,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.findMany({
      where: { firmId: session.firmId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
  ])

  if (!user) redirect('/login')

  const property = propertyRecord as (NonNullable<typeof propertyRecord> & { deletedAt?: Date | null }) | null
  if (!property) notFound()

  const canArchive = session.role === 'managing_partner' || session.role === 'admin'
  const comparableMatches = rankComparablesForProperty(
    {
      city: property.city,
      state: property.state,
      propertyUse: property.propertyUse,
      tenureType: property.tenureType,
    },
    comparableCandidates,
  ).slice(0, 5)

  return (
    <>
      <Header user={user} title={property.address} />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Property Record
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Hold location context, ownership, evidence signals, and active instructions in one record.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review the registry details, linked cases, and nearby comparable evidence before opening a fresh valuation instruction.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Cases
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {property._count.cases}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Owner
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                  {property.client?.name ?? 'Unassigned'}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Evidence
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {comparableMatches.length} nearby comps
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <section className="surface-card rounded-[28px] p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-slate-950">Property Details</h2>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Registry record</p>
                  </div>
                </div>

                <PropertyManagementPanel
                  propertyId={property.id}
                  clients={clientOptions}
                  initial={{
                    clientId: property.clientId,
                    address: property.address,
                    city: property.city,
                    state: property.state,
                    localGovernment: property.localGovernment,
                    propertyUse: property.propertyUse,
                    tenureType: property.tenureType,
                    plotSize: property.plotSize ? Number(property.plotSize.toString()) : null,
                    plotSizeUnit: property.plotSizeUnit,
                    description: property.description,
                    latitude: property.latitude ? Number(property.latitude.toString()) : null,
                    longitude: property.longitude ? Number(property.longitude.toString()) : null,
                    deletedAt: property.deletedAt?.toISOString() ?? null,
                  }}
                  canArchive={canArchive}
                />
              </div>

              <dl className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 first:pt-0">
                  <dt className="text-xs text-slate-500">Client</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">{property.client?.name ?? 'Unassigned'}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">Address</dt>
                  <dd className="mt-0.5 font-medium text-slate-950">{property.address}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">City / LGA</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {[property.city, property.localGovernment].filter(Boolean).join(' / ') || '—'}
                  </dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">State</dt>
                  <dd className="mt-0.5 text-slate-700">{property.state}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">Property Use</dt>
                  <dd className="mt-0.5 text-slate-700">{labelOf(property.propertyUse)}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">Tenure Type</dt>
                  <dd className="mt-0.5 text-slate-700">{labelOf(property.tenureType)}</dd>
                </div>
                {property.plotSize ? (
                  <div className="py-2.5">
                    <dt className="text-xs text-slate-500">Plot Size</dt>
                    <dd className="mt-0.5 text-slate-700">
                      {property.plotSize.toString()} {property.plotSizeUnit ?? 'sqm'}
                    </dd>
                  </div>
                ) : null}
                {property.latitude || property.longitude ? (
                  <div className="py-2.5">
                    <dt className="text-xs text-slate-500">Coordinates</dt>
                    <dd className="mt-0.5 text-slate-700">
                      {[property.latitude, property.longitude].filter((value) => value !== null).join(', ')}
                    </dd>
                  </div>
                ) : null}
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">Total Cases</dt>
                  <dd className="mt-0.5 font-semibold text-slate-950">{property._count.cases}</dd>
                </div>
                {property.deletedAt ? (
                  <div className="py-2.5">
                    <dt className="text-xs text-slate-500">Status</dt>
                    <dd className="mt-0.5 font-semibold text-amber-700">Archived</dd>
                  </div>
                ) : null}
                <div className="py-2.5">
                  <dt className="text-xs text-slate-500">Added</dt>
                  <dd className="mt-0.5 text-slate-700">{formatDate(property.createdAt)}</dd>
                </div>
              </dl>

              {property.description ? (
                <div className="rounded-[22px] bg-slate-50/80 px-4 py-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Description
                  </p>
                  <div
                    className="prose prose-sm max-w-none text-slate-700 prose-headings:mb-2 prose-headings:mt-0 prose-headings:text-slate-900 prose-p:my-2 prose-p:leading-6 prose-hr:my-4 prose-ul:my-2 prose-ul:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(property.description) }}
                  />
                </div>
              ) : null}
            </section>
          </div>

          <div className="lg:col-span-2">
            <section className="surface-card overflow-hidden rounded-[28px]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Linked Work
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    Cases ({property._count.cases})
                  </h2>
                </div>
                <Link
                  href="/cases/new"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 transition hover:text-brand-800"
                >
                  <FolderSearch className="h-3.5 w-3.5" />
                  New Case
                </Link>
              </div>

              {property.cases.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">No cases yet.</p>
              ) : (
                <>
                  <div className="space-y-3 p-4 lg:hidden">
                    {property.cases.map((item: typeof property.cases[0]) => (
                      <Link
                        key={item.id}
                        href={`/cases/${item.id}`}
                        className="block rounded-[24px] border border-slate-200 bg-white p-4 transition-colors hover:bg-brand-50/20"
                      >
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="min-w-0">
                              <p className="font-mono text-base font-semibold text-slate-950">{item.reference}</p>
                              <p className="mt-1 text-sm font-medium text-slate-700">{item.client.name}</p>
                              <p className="mt-1 text-sm capitalize text-slate-500">
                                {item.valuationType.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <div className="rounded-[20px] bg-slate-50/80 px-3.5 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Stage
                              </p>
                              <div className="mt-2">
                              <StageBadge stage={item.stage as CaseStage} />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[20px] bg-slate-50/80 px-3.5 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Due
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                            <span className="text-slate-400">Open case record</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                              View
                              <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="hidden lg:block">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/80">
                        <tr>
                          {['Reference', 'Client', 'Type', 'Stage', 'Due', ''].map((heading) => (
                            <th
                              key={heading}
                              className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {property.cases.map((item: typeof property.cases[0]) => (
                          <tr key={item.id} className="transition-colors hover:bg-brand-50/25">
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-slate-900">
                              {item.reference}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <Link href={`/clients/${item.client.id}`} className="font-medium hover:text-brand-700">
                                {item.client.name}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-slate-600">
                              {item.valuationType}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <StageBadge stage={item.stage as CaseStage} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                              {item.dueDate ? formatDate(item.dueDate) : '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                              <Link
                                href={`/cases/${item.id}`}
                                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
                              >
                                View
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="surface-card mt-6 overflow-hidden rounded-[28px]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Evidence Suggestions
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    Nearby Comparables ({comparableMatches.length})
                  </h2>
                </div>
                <Link
                  href={`/comparables?state=${encodeURIComponent(property.state)}`}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 transition hover:text-brand-800"
                >
                  View all comparables
                </Link>
              </div>

              {comparableMatches.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">
                  No comparable suggestions yet for this property.
                </p>
              ) : (
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/80">
                    <tr>
                      {['Address', 'Type', 'Price', 'Date', 'Match', ''].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {comparableMatches.map((comp) => (
                      <tr key={comp.id} className="transition-colors hover:bg-brand-50/25">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <p className="font-medium text-slate-900">{comp.address}</p>
                          <p className="text-xs text-slate-400">
                            {[comp.city, comp.state].filter(Boolean).join(', ')}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-slate-600">
                          {comp.comparableType}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                          {comp.salePrice
                            ? formatCurrency(comp.salePrice.toString())
                            : comp.rentalValue
                              ? `${formatCurrency(comp.rentalValue.toString())}/yr`
                              : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                          {comp.transactionDate ? formatDate(comp.transactionDate) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                            Score {comp.score}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <Link
                            href={`/comparables/${comp.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
                          >
                            View
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
