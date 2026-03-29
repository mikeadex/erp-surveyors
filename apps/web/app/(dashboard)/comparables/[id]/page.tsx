import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { formatDate, formatCurrency } from '@valuation-os/utils'
import { CheckCircle2 } from 'lucide-react'

function labelOf(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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

  const TYPE_COLORS: Record<string, string> = {
    sales:  'bg-blue-50 text-blue-700',
    rental: 'bg-purple-50 text-purple-700',
    land:   'bg-orange-50 text-orange-700',
  }

  return (
    <>
      <Header user={user} title="Comparable" />
      <div className="p-6 max-w-3xl space-y-6">

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${TYPE_COLORS[comp.comparableType] ?? 'bg-gray-100 text-gray-700'}`}>
            {comp.comparableType}
          </span>
          {comp.isVerified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Verified
            </span>
          )}
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Location</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="col-span-2">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{comp.address}</dd>
            </div>
            <div>
              <dt className="text-gray-500">City</dt>
              <dd className="text-gray-700 mt-0.5">{comp.city ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">State</dt>
              <dd className="text-gray-700 mt-0.5">{comp.state ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Valuation Data</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {comp.salePrice && (
              <div>
                <dt className="text-gray-500">Sale Price</dt>
                <dd className="text-gray-900 font-semibold mt-0.5">
                  {formatCurrency(comp.salePrice.toString())}
                </dd>
              </div>
            )}
            {comp.rentalValue && (
              <div>
                <dt className="text-gray-500">Rental Value</dt>
                <dd className="text-gray-900 font-semibold mt-0.5">
                  {formatCurrency(comp.rentalValue.toString())}/yr
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Transaction Date</dt>
              <dd className="text-gray-700 mt-0.5">
                {comp.transactionDate ? formatDate(comp.transactionDate) : '—'}
              </dd>
            </div>
            {comp.propertyUse && (
              <div>
                <dt className="text-gray-500">Property Use</dt>
                <dd className="text-gray-700 mt-0.5 capitalize">{labelOf(comp.propertyUse)}</dd>
              </div>
            )}
            {comp.tenureType && (
              <div>
                <dt className="text-gray-500">Tenure</dt>
                <dd className="text-gray-700 mt-0.5">{labelOf(comp.tenureType)}</dd>
              </div>
            )}
            {comp.plotSize && (
              <div>
                <dt className="text-gray-500">Plot Size</dt>
                <dd className="text-gray-700 mt-0.5">
                  {comp.plotSize.toString()} {comp.plotSizeUnit ?? 'sqm'}
                </dd>
              </div>
            )}
            {comp.buildingSize && (
              <div>
                <dt className="text-gray-500">Building Size</dt>
                <dd className="text-gray-700 mt-0.5">
                  {comp.buildingSize.toString()} {comp.buildingSizeUnit ?? 'sqm'}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Source</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Source</dt>
              <dd className="text-gray-700 mt-0.5">{comp.source ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Source Contact</dt>
              <dd className="text-gray-700 mt-0.5">{comp.sourceContact ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Added by</dt>
              <dd className="text-gray-700 mt-0.5">
                {addedBy ? `${addedBy.firstName} ${addedBy.lastName}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Added on</dt>
              <dd className="text-gray-700 mt-0.5">{formatDate(comp.createdAt)}</dd>
            </div>
          </dl>
          {comp.notes && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <dt className="text-xs text-gray-500 mb-1">Notes</dt>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comp.notes}</p>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
