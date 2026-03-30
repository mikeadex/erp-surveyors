import { Suspense } from 'react'
import Link from 'next/link'
import { Building2, FileText, Ruler, MapPin } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { PropertiesFiltersBar } from '@/components/properties/properties-filters-bar'
import { CreatePropertyModalTrigger } from '@/components/properties/create-property-modal-trigger'
import { formatDate } from '@valuation-os/utils'
import { buildPropertySearchWhere } from '@/lib/properties/property-records'
import { richTextToPlainText } from '@/lib/editor/rich-text'

interface SearchParams {
  page?: string
  search?: string
  propertyUse?: string
  state?: string
  status?: string
}

function formatPropertyLabel(value: string) {
  return value.replace(/_/g, ' ')
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = 20
  const skip = (page - 1) * pageSize
  const search = params.search?.trim()
  const status = params.status === 'archived' || params.status === 'all' ? params.status : 'active'

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  const where = {
    firmId: session.firmId,
    ...(status === 'archived'
      ? { deletedAt: { not: null } }
      : status === 'all'
        ? {}
        : { deletedAt: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(params.propertyUse ? { propertyUse: params.propertyUse as any } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(buildPropertySearchWhere(search) ?? {}),
  }

  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where,
      // Prisma types in this workspace lag the generated `deletedAt` field, so we widen the
      // select shape locally while keeping the actual query aligned to the live schema.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: {
        id: true, address: true, city: true, state: true,
        localGovernment: true, propertyUse: true, tenureType: true,
        plotSize: true, plotSizeUnit: true, description: true, createdAt: true, deletedAt: true,
        _count: { select: { cases: true } },
      } as any,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.property.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)
  const properties = items as unknown as Array<{
    id: string
    address: string
    city: string
    state: string
    localGovernment: string | null
    propertyUse: string
    tenureType: string
    plotSize: string | number | null
    plotSizeUnit: string | null
    description: string | null
    createdAt: Date
    deletedAt: Date | null
    _count: { cases: number }
  }>

  return (
    <>
      <Header user={user} title="Properties" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Registry Desk
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Track property records, location context, and case readiness.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Search the registry by address, location, use, and notes while keeping the layout aligned with the calmer operating shell.
              </p>
            </div>
            <CreatePropertyModalTrigger />
          </div>
        </section>

        <PropertiesFiltersBar
          search={search}
          propertyUse={params.propertyUse}
          state={params.state}
          status={status}
        />

        {items.length === 0 ? (
          <div className="surface-card rounded-[28px] p-12 text-center">
            <p className="text-sm text-slate-500">No properties found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 xl:hidden">
              {properties.map((p) => {
                const descriptionPreview = richTextToPlainText(p.description)

                return (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="surface-card block rounded-[28px] p-4 transition-colors hover:bg-slate-50/70 sm:p-5"
                  >
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex shrink-0 rounded-2xl bg-slate-100 p-2.5">
                        <Building2 className="h-4 w-4 text-slate-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-lg font-semibold leading-8 text-slate-900">
                              {p.address}
                            </p>
                            <p className="mt-0.5 text-sm capitalize text-slate-400">
                              {formatPropertyLabel(p.propertyUse)}
                            </p>
                          </div>
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                            {p._count.cases} cases
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {p.deletedAt ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Archived
                            </span>
                          ) : null}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                            {formatPropertyLabel(p.tenureType)}
                          </span>
                          {p.plotSize ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                              {p.plotSize} {p.plotSizeUnit ?? 'sqm'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Location
                        </p>
                        <div className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-700">
                          <MapPin className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                          <span>
                            {[p.localGovernment, p.city, p.state].filter(Boolean).join(', ') ||
                              'No location details'}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Registry
                        </p>
                        <div className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-700">
                          <Ruler className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                          <span>{p.plotSize ? `${p.plotSize} ${p.plotSizeUnit ?? 'sqm'}` : 'No plot size recorded'}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">Added {formatDate(p.createdAt)}</p>
                      </div>
                    </div>

                    {descriptionPreview ? (
                      <div className="flex items-start gap-2 rounded-[22px] bg-brand-50/50 px-3.5 py-3 text-sm leading-6 text-slate-600">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        <span className="line-clamp-3">{descriptionPreview}</span>
                      </div>
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-slate-200 px-3.5 py-3 text-sm text-slate-400">
                        No property notes
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
                      <span className="text-slate-400">Open property record</span>
                      <span className="font-medium text-brand-700">View property</span>
                    </div>
                  </div>
                  </Link>
                )
              })}
            </div>

            <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Address', 'Use', 'Tenure', 'Size', 'Cases', 'Added', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {properties.map((p) => {
                    const descriptionPreview = richTextToPlainText(p.description)

                    return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="max-w-[260px] px-4 py-4 align-top">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.address}</p>
                          <p className="text-xs text-slate-400">
                            {[p.localGovernment, p.city, p.state].filter(Boolean).join(', ')}
                          </p>
                          {p.deletedAt && (
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              Archived
                            </p>
                          )}
                          {descriptionPreview && (
                            <div className="mt-2 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                              <span className="line-clamp-2">{descriptionPreview}</span>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm capitalize text-slate-700">
                          {formatPropertyLabel(p.propertyUse)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                          {formatPropertyLabel(p.tenureType)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                          {p.plotSize ? `${p.plotSize} ${p.plotSizeUnit ?? 'sqm'}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                          {p._count.cases}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                          <Link
                            href={`/properties/${p.id}`}
                            className="font-medium text-brand-700 hover:text-brand-800"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
          </Suspense>
        )}
      </div>
    </>
  )
}
