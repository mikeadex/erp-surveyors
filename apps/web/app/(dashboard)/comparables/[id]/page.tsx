import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { CheckCircle2, MapPin, Scale, ShieldCheck } from 'lucide-react'
import { formatCurrency, formatDate } from '@valuation-os/utils'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { sanitizeRichTextHtml } from '@/lib/editor/rich-text'
import { Header } from '@/components/layout/header'

function labelOf(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function ComparableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, comp] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.comparable.findFirst({
      where: { id, firmId: session.firmId },
    }),
  ])

  if (!user) redirect('/login')
  if (!comp) notFound()

  const addedBy = await prisma.user.findUnique({
    where: { id: comp.addedById },
    select: { firstName: true, lastName: true },
  })

  const typeColors: Record<string, string> = {
    sales: 'bg-brand-50 text-brand-700',
    rental: 'bg-emerald-50 text-emerald-700',
    land: 'bg-amber-50 text-amber-700',
  }

  return (
    <>
      <Header user={user} title="Comparable" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Comparable Record
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Review evidence quality, location context, and value points before attaching this record to a case.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                The comparable library separates reusable market evidence from case-specific judgement and adjustments.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Type</p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-950">{comp.comparableType}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Value</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {comp.salePrice
                    ? formatCurrency(comp.salePrice.toString())
                    : comp.rentalValue
                      ? `${formatCurrency(comp.rentalValue.toString())}/yr`
                      : '—'}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Verified</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{comp.isVerified ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${typeColors[comp.comparableType] ?? 'bg-slate-100 text-slate-700'}`}>
            {comp.comparableType}
          </span>
          {comp.isVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Verified
            </span>
          ) : null}
        </div>

        <section className="surface-card rounded-[28px] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Location</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Evidence source</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="col-span-2">
              <dt className="text-slate-500">Address</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{comp.address}</dd>
            </div>
            <div>
              <dt className="text-slate-500">City</dt>
              <dd className="mt-0.5 text-slate-700">{comp.city ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">State</dt>
              <dd className="mt-0.5 text-slate-700">{comp.state ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="surface-card rounded-[28px] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Valuation Data</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Market inputs</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {comp.salePrice ? (
              <div>
                <dt className="text-slate-500">Sale Price</dt>
                <dd className="mt-0.5 font-semibold text-slate-950">
                  {formatCurrency(comp.salePrice.toString())}
                </dd>
              </div>
            ) : null}
            {comp.rentalValue ? (
              <div>
                <dt className="text-slate-500">Rental Value</dt>
                <dd className="mt-0.5 font-semibold text-slate-950">
                  {formatCurrency(comp.rentalValue.toString())}/yr
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-slate-500">Transaction Date</dt>
              <dd className="mt-0.5 text-slate-700">
                {comp.transactionDate ? formatDate(comp.transactionDate) : '—'}
              </dd>
            </div>
            {comp.propertyUse ? (
              <div>
                <dt className="text-slate-500">Property Use</dt>
                <dd className="mt-0.5 capitalize text-slate-700">{labelOf(comp.propertyUse)}</dd>
              </div>
            ) : null}
            {comp.tenureType ? (
              <div>
                <dt className="text-slate-500">Tenure</dt>
                <dd className="mt-0.5 text-slate-700">{labelOf(comp.tenureType)}</dd>
              </div>
            ) : null}
            {comp.plotSize ? (
              <div>
                <dt className="text-slate-500">Plot Size</dt>
                <dd className="mt-0.5 text-slate-700">
                  {comp.plotSize.toString()} {comp.plotSizeUnit ?? 'sqm'}
                </dd>
              </div>
            ) : null}
            {comp.buildingSize ? (
              <div>
                <dt className="text-slate-500">Building Size</dt>
                <dd className="mt-0.5 text-slate-700">
                  {comp.buildingSize.toString()} {comp.buildingSizeUnit ?? 'sqm'}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="surface-card rounded-[28px] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Source</h2>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Provenance</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="mt-0.5 text-slate-700">{comp.source ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Source Contact</dt>
              <dd className="mt-0.5 text-slate-700">{comp.sourceContact ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Added by</dt>
              <dd className="mt-0.5 text-slate-700">
                {addedBy ? `${addedBy.firstName} ${addedBy.lastName}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Added on</dt>
              <dd className="mt-0.5 text-slate-700">{formatDate(comp.createdAt)}</dd>
            </div>
          </dl>
          {comp.notes ? (
            <div className="mt-4 rounded-[22px] bg-slate-50/80 px-4 py-4">
              <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</dt>
              <div
                className="prose prose-sm max-w-none text-slate-700 prose-headings:mb-2 prose-headings:mt-0 prose-headings:text-slate-900 prose-p:my-2 prose-p:leading-6 prose-hr:my-4 prose-ul:my-2 prose-ul:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(comp.notes) }}
              />
            </div>
          ) : null}
        </section>
      </div>
    </>
  )
}
