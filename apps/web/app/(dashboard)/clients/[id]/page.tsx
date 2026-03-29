import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { StageBadge } from '@/components/cases/stage-badge'
import { formatDate } from '@valuation-os/utils'
import { Building2, Mail, Phone, MapPin, User } from 'lucide-react'
import Link from 'next/link'
import type { CaseStage } from '@valuation-os/types'
import { assertRecordBranchAccess } from '@/lib/auth/branch-scope'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, client] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.client.findFirst({
      where: { id, firmId: session.firmId, deletedAt: null },
      include: {
        branch: { select: { id: true, name: true } },
        contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
        cases: {
          select: {
            id: true, reference: true, stage: true, valuationType: true,
            isOverdue: true, dueDate: true, createdAt: true,
            property: { select: { id: true, address: true, city: true, state: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { cases: true } },
      },
    }),
  ])

  if (!user) redirect('/login')
  if (!client) notFound()
  try {
    assertRecordBranchAccess(session, client.branchId, 'client')
  } catch {
    notFound()
  }

  return (
    <>
      <Header user={user} title={client.name} />
      <div className="p-6 space-y-6 max-w-5xl">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: client info */}
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  {client.type === 'corporate' ? (
                    <Building2 className="h-5 w-5 text-blue-600" />
                  ) : (
                    <User className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{client.type}</p>
                </div>
              </div>

              {client.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <dl className="space-y-2 text-sm divide-y divide-gray-100">
                {client.email && (
                  <div className="flex items-center gap-2 pt-2 first:pt-0">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline truncate">
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 pt-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-700">{client.phone}</span>
                  </div>
                )}
                {(client.city || client.state) && (
                  <div className="flex items-center gap-2 pt-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-700">
                      {[client.address, client.city, client.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {client.branch?.name && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-gray-500">Branch</span>
                    <span className="text-gray-700">{client.branch.name}</span>
                  </div>
                )}
                {client.rcNumber && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-gray-500">RC Number</span>
                    <span className="font-mono text-xs text-gray-700">{client.rcNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-500">Client since</span>
                  <span className="text-gray-700">{formatDate(client.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-500">Total cases</span>
                  <span className="font-semibold text-gray-900">{client._count.cases}</span>
                </div>
              </dl>
            </section>

            {/* Contacts */}
            {client.contacts.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">Contacts</h2>
                <ul className="space-y-3">
                  {client.contacts.map((c: typeof client.contacts[0]) => (
                    <li key={c.id} className="text-sm">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.isPrimary && (
                          <span className="text-[10px] font-semibold rounded-full bg-blue-50 text-blue-600 px-1.5 py-0.5">
                            Primary
                          </span>
                        )}
                      </div>
                      {c.role && <p className="text-xs text-gray-400">{c.role}</p>}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline">
                          {c.email}
                        </a>
                      )}
                      {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right: cases */}
          <div className="lg:col-span-2">
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Cases ({client._count.cases})
                </h2>
                <Link
                  href={`/cases/new`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + New Case
                </Link>
              </div>
              {client.cases.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">No cases yet.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Reference', 'Property', 'Stage', 'Due', ''].map((h) => (
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
                    {client.cases.map((c: typeof client.cases[0]) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-gray-900">
                          {c.reference}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">
                          {c.property?.address ?? '—'}
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
          </div>
        </div>
      </div>
    </>
  )
}
