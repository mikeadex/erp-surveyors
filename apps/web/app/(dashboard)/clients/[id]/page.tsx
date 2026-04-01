import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowRight, Building2, FolderKanban, Mail, MapPin, Phone, User } from 'lucide-react'
import type { CaseStage } from '@valuation-os/types'
import { formatDate } from '@valuation-os/utils'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { assertRecordBranchAccess, canAccessAllBranches } from '@/lib/auth/branch-scope'
import { sanitizeRichTextHtml } from '@/lib/editor/rich-text'
import { Header } from '@/components/layout/header'
import { StageBadge } from '@/components/cases/stage-badge'
import { ClientManagementPanel } from '@/components/clients/client-management-panel'
import { ClientContactsPanel } from '@/components/clients/client-contacts-panel'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, client, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.client.findFirst({
      where: { id, firmId: session.firmId },
      select: {
        id: true,
        branchId: true,
        type: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        rcNumber: true,
        notes: true,
        tags: true,
        createdAt: true,
        deletedAt: true,
        branch: { select: { id: true, name: true } },
        contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
        cases: {
          select: {
            id: true,
            reference: true,
            stage: true,
            valuationType: true,
            isOverdue: true,
            dueDate: true,
            createdAt: true,
            property: { select: { id: true, address: true, city: true, state: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { cases: true } },
      },
    }),
    prisma.branch.findMany({
      where: { firmId: session.firmId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!user) redirect('/login')
  if (!client) notFound()

  try {
    assertRecordBranchAccess(session, client.branchId, 'client')
  } catch {
    notFound()
  }

  const visibleBranches = canAccessAllBranches(session.role)
    ? branches
    : branches.filter((branch) => branch.id === session.branchId)
  const canArchive = session.role === 'managing_partner' || session.role === 'admin'

  return (
    <>
      <Header user={user} title={client.name} />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Client Workspace
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Keep relationship context, contacts, and active instructions together.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review branch ownership, core contact details, open valuation work, and stakeholder notes without leaving the record.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                  {client.type}
                </span>
                {client.branch?.name ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {client.branch.name}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Cases
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {client._count.cases}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Contact
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                  {client.email ?? client.phone ?? 'Not set'}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Since
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDate(client.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <section className="surface-card rounded-[28px] p-5 space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-brand-50 text-brand-700 shadow-[0_18px_34px_-28px_rgba(11,106,56,0.4)]">
                    {client.type === 'corporate' ? (
                      <Building2 className="h-6 w-6" />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Client Record
                    </p>
                    <p className="mt-1 text-[1.85rem] font-semibold leading-[1.05] tracking-tight text-slate-950">
                      {client.name}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                      {client.type}
                    </p>
                  </div>
                </div>

                <ClientManagementPanel
                  clientId={client.id}
                  initial={{
                    branchId: client.branchId,
                    branchName: client.branch?.name ?? null,
                    type: client.type,
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    address: client.address,
                    city: client.city,
                    state: client.state,
                    rcNumber: client.rcNumber,
                    notes: client.notes,
                    tags: client.tags,
                    deletedAt: client.deletedAt?.toISOString() ?? null,
                  }}
                  branches={visibleBranches}
                  canSelectBranch={canAccessAllBranches(session.role)}
                  canArchive={canArchive}
                  mode="trigger"
                  buttonClassName="inline-flex items-center justify-center gap-2 self-start rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-800"
                />
              </div>

              {client.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {client.notes ? (
                <div className="rounded-[24px] bg-slate-50/80 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Relationship Notes
                  </p>
                  <div
                    className="prose prose-sm mt-2 max-w-none text-slate-700 prose-headings:mb-2 prose-headings:mt-0 prose-headings:text-slate-900 prose-p:my-2 prose-p:leading-6 prose-hr:my-4 prose-ul:my-2 prose-ul:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(client.notes) }}
                  />
                </div>
              ) : null}

              <dl className="divide-y divide-slate-100 text-sm">
                {client.email ? (
                  <div className="flex items-center gap-3 py-3 first:pt-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                    </span>
                    <a href={`mailto:${client.email}`} className="truncate text-brand-700 hover:text-brand-800 hover:underline">
                      {client.email}
                    </a>
                  </div>
                ) : null}
                {client.phone ? (
                  <div className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-slate-700">{client.phone}</span>
                  </div>
                ) : null}
                {client.city || client.state ? (
                  <div className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-slate-700">
                      {[client.address, client.city, client.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                ) : null}
              </dl>

              <div className="grid gap-3 sm:grid-cols-2">
                {client.branch?.name ? (
                  <div className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Branch
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{client.branch.name}</p>
                  </div>
                ) : null}
                {client.rcNumber ? (
                  <div className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      RC Number
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-800">{client.rcNumber}</p>
                  </div>
                ) : null}
                <div className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Client since
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(client.createdAt)}</p>
                </div>
                <div className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Total cases
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{client._count.cases}</p>
                </div>
              </div>
            </section>

            <ClientContactsPanel
              clientId={client.id}
              contacts={client.contacts.map((contact) => ({
                id: contact.id,
                name: contact.name,
                role: contact.role,
                email: contact.email,
                phone: contact.phone,
                isPrimary: contact.isPrimary,
              }))}
              isArchived={Boolean(client.deletedAt)}
            />
          </div>

          <div className="lg:col-span-2">
            <section className="surface-card overflow-hidden rounded-[28px]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Active Work
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    Cases ({client._count.cases})
                  </h2>
                </div>
                <Link
                  href="/cases/new"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 transition hover:text-brand-800"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  New Case
                </Link>
              </div>

              {client.cases.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">No cases yet.</p>
              ) : (
                <>
                  <div className="space-y-3 p-4 lg:hidden">
                    {client.cases.map((item: typeof client.cases[0]) => (
                      <Link
                        key={item.id}
                        href={`/cases/${item.id}`}
                        className="block rounded-[24px] border border-slate-200 bg-white p-4 transition-colors hover:bg-brand-50/20"
                      >
                          <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="min-w-0">
                              <p className="font-mono text-base font-semibold text-slate-950">{item.reference}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                                {item.property?.address ?? 'No property linked'}
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

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[20px] bg-slate-50/80 px-3.5 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Due
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                              </p>
                            </div>
                            <div className="rounded-[20px] bg-slate-50/80 px-3.5 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Type
                              </p>
                              <p className="mt-1 text-sm font-medium capitalize text-slate-700">
                                {item.valuationType.replace(/_/g, ' ')}
                              </p>
                            </div>
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
                          {['Reference', 'Property', 'Stage', 'Due', ''].map((heading) => (
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
                        {client.cases.map((item: typeof client.cases[0]) => (
                          <tr key={item.id} className="transition-colors hover:bg-brand-50/25">
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-slate-900">
                              {item.reference}
                            </td>
                            <td className="max-w-[160px] truncate px-4 py-3 text-sm text-slate-600">
                              {item.property?.address ?? '—'}
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
          </div>
        </div>
      </div>
    </>
  )
}
