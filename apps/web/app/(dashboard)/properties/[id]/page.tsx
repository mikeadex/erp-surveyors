import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { StageBadge } from '@/components/cases/stage-badge'
import { formatCurrency, formatDate } from '@valuation-os/utils'
import { MapPin } from 'lucide-react'
import Link from 'next/link'
import type { CaseStage } from '@valuation-os/types'
import { rankComparablesForProperty } from '@/lib/properties/property-records'
import { PropertyManagementPanel } from '@/components/properties/property-management-panel'
import { sanitizeRichTextHtml } from '@/lib/editor/rich-text'

function labelOf(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, propertyRecord, comparableCandidates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.property.findFirst({
      where: { id, firmId: session.firmId },
      select: {
        id: true,
        firmId: true,
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
            id: true, reference: true, stage: true, valuationType: true,
            isOverdue: true, dueDate: true, createdAt: true,
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
  ])

  if (!user) redirect('/login')
  // Prisma types in this workspace lag the generated `deletedAt` field, so we widen locally.
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
      <div className="p-6 space-y-6 max-w-5xl">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Property details card */}
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  <h2 className="text-sm font-semibold text-gray-900">Property Details</h2>
                </div>
                <PropertyManagementPanel
                  propertyId={property.id}
                  initial={{
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

              <dl className="space-y-3 text-sm divide-y divide-gray-100">
                <div className="pt-2 first:pt-0">
                  <dt className="text-xs text-gray-500">Address</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{property.address}</dd>
                </div>
                <div className="pt-2">
                  <dt className="text-xs text-gray-500">City / LGA</dt>
                  <dd className="mt-0.5 text-gray-700">
                    {[property.city, property.localGovernment].filter(Boolean).join(' / ') || '—'}
                  </dd>
                </div>
                <div className="pt-2">
                  <dt className="text-xs text-gray-500">State</dt>
                  <dd className="mt-0.5 text-gray-700">{property.state}</dd>
                </div>
                <div className="pt-2">
                  <dt className="text-xs text-gray-500">Property Use</dt>
                  <dd className="mt-0.5 text-gray-700">{labelOf(property.propertyUse)}</dd>
                </div>
                <div className="pt-2">
                  <dt className="text-xs text-gray-500">Tenure Type</dt>
                  <dd className="mt-0.5 text-gray-700">{labelOf(property.tenureType)}</dd>
                </div>
                {property.plotSize && (
                  <div className="pt-2">
                    <dt className="text-xs text-gray-500">Plot Size</dt>
                    <dd className="mt-0.5 text-gray-700">
                      {property.plotSize.toString()} {property.plotSizeUnit ?? 'sqm'}
                    </dd>
                  </div>
                )}
                {(property.latitude || property.longitude) && (
                  <div className="pt-2">
                    <dt className="text-xs text-gray-500">Coordinates</dt>
                    <dd className="mt-0.5 text-gray-700">
                      {[property.latitude, property.longitude].filter((value) => value !== null).join(', ')}
                    </dd>
                  </div>
                )}
                <div className="pt-2">
                  <dt className="text-xs text-gray-500">Total Cases</dt>
                  <dd className="mt-0.5 font-semibold text-gray-900">{property._count.cases}</dd>
                </div>
                {property.deletedAt && (
                  <div className="pt-2">
                    <dt className="text-xs text-gray-500">Status</dt>
                    <dd className="mt-0.5 font-semibold text-amber-700">Archived</dd>
                  </div>
                )}
                <div className="pt-2">
                  <dt className="text-xs text-gray-500">Added</dt>
                  <dd className="mt-0.5 text-gray-700">{formatDate(property.createdAt)}</dd>
                </div>
              </dl>

              {property.description && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <div
                    className="prose prose-sm max-w-none text-gray-700 prose-headings:mb-2 prose-headings:mt-0 prose-headings:text-gray-900 prose-p:my-2 prose-p:leading-6 prose-hr:my-4 prose-ul:my-2 prose-ul:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(property.description) }}
                  />
                </div>
              )}
            </section>
          </div>

          {/* Cases table */}
          <div className="lg:col-span-2">
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Cases ({property._count.cases})
                </h2>
                <Link href="/cases/new" className="text-xs font-medium text-blue-600 hover:text-blue-800">
                  + New Case
                </Link>
              </div>

              {property.cases.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">No cases yet.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Reference', 'Client', 'Type', 'Stage', 'Due', ''].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {property.cases.map((c: typeof property.cases[0]) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-gray-900">
                          {c.reference}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <Link href={`/clients/${c.client.id}`} className="hover:text-blue-600">
                            {c.client.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600">
                          {c.valuationType}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StageBadge stage={c.stage as CaseStage} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {c.dueDate ? formatDate(c.dueDate) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <Link href={`/cases/${c.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Nearby Comparables ({comparableMatches.length})
                </h2>
                <Link
                  href={`/comparables?state=${encodeURIComponent(property.state)}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  View all comparables
                </Link>
              </div>

              {comparableMatches.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">
                  No comparable suggestions yet for this property.
                </p>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Address', 'Type', 'Price', 'Date', 'Match', ''].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {comparableMatches.map((comp) => (
                      <tr key={comp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p className="font-medium text-gray-900">{comp.address}</p>
                          <p className="text-xs text-gray-400">
                            {[comp.city, comp.state].filter(Boolean).join(', ')}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600">
                          {comp.comparableType}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {comp.salePrice
                            ? formatCurrency(comp.salePrice.toString())
                            : comp.rentalValue
                              ? `${formatCurrency(comp.rentalValue.toString())}/yr`
                              : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {comp.transactionDate ? formatDate(comp.transactionDate) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Score {comp.score}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          <Link href={`/comparables/${comp.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                            View →
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
