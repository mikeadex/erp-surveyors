import { Suspense } from 'react'
import Link from 'next/link'
import { BadgeCheck, Building2, FileText, MapPin, Ruler } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { ComparablesFiltersBar } from '@/components/comparables/comparables-filters-bar'
import { formatDate, formatCurrency } from '@valuation-os/utils'
import { buildComparableSearchWhere } from '@/lib/comparables/comparable-records'
import { CreateComparableModalTrigger } from '@/components/comparables/create-comparable-modal-trigger'
import { ImportComparablesModalTrigger } from '@/components/comparables/import-comparables-modal-trigger'
import { richTextToPlainText } from '@/lib/editor/rich-text'

interface SearchParams {
  page?: string
  search?: string
  comparableType?: string
  state?: string
}

export default async function ComparablesPage({
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  const where = {
    firmId: session.firmId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(params.comparableType ? { comparableType: params.comparableType as any } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(buildComparableSearchWhere(search) ?? {}),
  }

  const [items, total] = await Promise.all([
    prisma.comparable.findMany({
      where,
      select: {
        id: true, comparableType: true, address: true, city: true, state: true,
        salePrice: true, rentalValue: true, transactionDate: true,
        plotSize: true, buildingSize: true, pricePerSqm: true, source: true, notes: true, isVerified: true, createdAt: true,
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comparable.count({ where }),
  ])

  const importJobs = await prisma.comparableImportJob.findMany({
    where: { firmId: session.firmId },
    select: {
      id: true,
      fileKey: true,
      status: true,
      importedCount: true,
      failedCount: true,
      errors: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  const totalPages = Math.ceil(total / pageSize)

  const TYPE_LABELS: Record<string, string> = {
    sales: 'Sale',
    rental: 'Rental',
    land: 'Land',
  }

  return (
    <>
      <Header user={user} title="Comparables" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Market Evidence
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Review comparables, pricing signals, and valuation support evidence.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Search the evidence bank by address, type, location, and source while keeping the registry experience aligned with the calmer operating shell.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ImportComparablesModalTrigger />
              <CreateComparableModalTrigger />
            </div>
          </div>
        </section>

        <ComparablesFiltersBar
          search={search}
          comparableType={params.comparableType}
          state={params.state}
        />

        {importJobs.length > 0 ? (
          <section className="surface-card rounded-[28px] p-5 lg:p-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Recent Imports
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Review the latest comparable import jobs.
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Each job keeps imported counts and row-level failures so the team can correct only the affected rows.
              </p>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {importJobs.map((job) => {
                const errors = Array.isArray(job.errors)
                  ? (job.errors as Array<{ row: number; error: string }>)
                  : []

                return (
                  <div
                    key={job.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {job.fileKey}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {job.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                        {job.importedCount} ok
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700">
                        {job.failedCount} failed
                      </span>
                      <span>{formatDate(job.createdAt)}</span>
                    </div>

                    {errors[0] ? (
                      <div className="mt-4 rounded-2xl border border-red-100 bg-white px-3 py-2.5 text-xs leading-5 text-slate-600">
                        <span className="font-semibold text-red-600">Row {errors[0].row}</span>
                        <span> — {errors[0].error}</span>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
                        No row errors recorded.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {items.length === 0 ? (
          <div className="surface-card rounded-[28px] p-8 text-center lg:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Empty Library
            </p>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">
              Start the evidence bank by importing comparables or adding one manually.
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              CSV import is the fastest way to bring in a firm library, especially when you already have historic market evidence in spreadsheets.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ImportComparablesModalTrigger
                label="Import Comparables"
                buttonClassName="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-800"
              />
              <CreateComparableModalTrigger />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 xl:hidden">
              {items.map((c: typeof items[0]) => {
                const notesPreview = richTextToPlainText(c.notes)

                return (
                  <Link
                    key={c.id}
                    href={`/comparables/${c.id}`}
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
                              {c.address}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-400">
                              {[c.city, c.state].filter(Boolean).join(', ') || 'No location details'}
                            </p>
                          </div>
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                            {TYPE_LABELS[c.comparableType] ?? c.comparableType}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {c.isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                              <BadgeCheck className="h-3 w-3" />
                              Verified
                            </span>
                          ) : null}
                          {c.pricePerSqm ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                              {formatCurrency(c.pricePerSqm.toString())}/sqm
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Value
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">
                          {c.salePrice
                            ? formatCurrency(c.salePrice.toString())
                            : c.rentalValue
                              ? `${formatCurrency(c.rentalValue.toString())}/yr`
                              : 'No pricing recorded'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {c.transactionDate ? formatDate(c.transactionDate) : 'No transaction date'}
                        </p>
                      </div>

                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Size
                        </p>
                        <div className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-700">
                          <Ruler className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                          <span>
                            {c.buildingSize
                              ? `${c.buildingSize} sqm building`
                              : c.plotSize
                                ? `${c.plotSize} sqm plot`
                                : 'No size recorded'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Source
                      </p>
                      <div className="mt-1 flex items-start gap-2 text-sm leading-6 text-slate-700">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                        <span>{c.source ?? 'No source recorded'}</span>
                      </div>
                    </div>

                    {notesPreview ? (
                      <div className="flex items-start gap-2 rounded-[22px] bg-brand-50/50 px-3.5 py-3 text-sm leading-6 text-slate-600">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        <span className="line-clamp-3">{notesPreview}</span>
                      </div>
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-slate-200 px-3.5 py-3 text-sm text-slate-400">
                        No comparable notes
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
                      <span className="text-slate-400">Open comparable record</span>
                      <span className="font-medium text-brand-700">View comparable</span>
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
                    {['Type', 'Address', 'Price / Rental', 'Size', 'Date', 'Source', ''].map((h) => (
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
                  {items.map((c: typeof items[0]) => {
                    const notesPreview = richTextToPlainText(c.notes)

                    return (
                    <tr key={c.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                          {TYPE_LABELS[c.comparableType] ?? c.comparableType}
                        </span>
                        {c.isVerified && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            ✓
                          </span>
                        )}
                      </td>
                      <td className="max-w-[220px] px-4 py-4 align-top text-sm text-slate-900">
                        <p className="truncate font-semibold">{c.address}</p>
                        <p className="text-xs text-slate-400">
                          {[c.city, c.state].filter(Boolean).join(', ')}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-sm font-semibold text-slate-900">
                        {c.salePrice
                          ? formatCurrency(c.salePrice.toString())
                          : c.rentalValue
                            ? `${formatCurrency(c.rentalValue.toString())}/yr`
                            : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-600">
                        <div>
                          {c.buildingSize
                            ? `${c.buildingSize} sqm`
                            : c.plotSize
                              ? `${c.plotSize} sqm`
                              : '—'}
                        </div>
                        {c.pricePerSqm && (
                          <div className="text-xs text-slate-400">
                            {formatCurrency(c.pricePerSqm.toString())}/sqm
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-500">
                        {c.transactionDate ? formatDate(c.transactionDate) : '—'}
                      </td>
                      <td className="max-w-[180px] px-4 py-4 align-top text-sm text-slate-500">
                        <p className="truncate">{c.source ?? '—'}</p>
                        {notesPreview ? (
                          <div className="mt-2 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                            <span className="line-clamp-2">{notesPreview}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right align-top text-sm">
                        <Link
                          href={`/comparables/${c.id}`}
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
