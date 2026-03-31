import { Suspense } from 'react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { formatDate } from '@valuation-os/utils'
import { Fingerprint, Globe, History, ShieldCheck } from 'lucide-react'
import { AuditFiltersBar } from '@/components/audit/audit-filters-bar'

interface SearchParams {
  page?: string
  entityType?: string
  entityId?: string
  userId?: string
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  if (session.role !== 'managing_partner') redirect('/dashboard')

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = 30
  const skip = (page - 1) * pageSize

  const [user, users] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.user.findMany({
      where: { firmId: session.firmId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ])
  if (!user) redirect('/login')

  const where = {
    firmId: session.firmId,
    ...(params.entityType ? { entityType: { contains: params.entityType, mode: 'insensitive' as const } } : {}),
    ...(params.entityId ? { entityId: params.entityId } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header user={user} title="Audit Log" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Governance Trail
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Review who changed what, when it happened, and where it came from.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep governance activity searchable and readable without losing the calmer operating shell.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[
            { label: 'Audit Events', helper: `${total} captured`, icon: History },
            { label: 'Entity Filters', helper: params.entityType ?? 'All entities', icon: ShieldCheck },
            { label: 'Entity Record', helper: params.entityId ? 'Single record' : 'All records', icon: Fingerprint },
            { label: 'User Scope', helper: params.userId ? 'Single user' : 'All users', icon: Fingerprint },
            { label: 'Network Trace', helper: 'IP visibility enabled', icon: Globe },
          ].map((item) => (
            <div key={item.label} className="surface-card rounded-[24px] px-3.5 py-3.5 sm:px-4 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Overview
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">{item.helper}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 sm:h-10 sm:w-10">
                  <item.icon className="h-4 w-4" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <AuditFiltersBar
          entityType={params.entityType}
          entityId={params.entityId}
          userId={params.userId}
          users={users}
        />

        {logs.length === 0 ? (
          <div className="surface-card rounded-[28px] p-12 text-center">
            <p className="text-sm text-slate-500">No audit events found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 xl:hidden">
              {logs.map((log: typeof logs[0]) => (
                <div key={log.id} className="surface-card rounded-[28px] p-4 sm:p-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="flex shrink-0 rounded-2xl bg-slate-100 p-2.5">
                        <History className="h-4 w-4 text-slate-500" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold leading-8 text-slate-900">{log.action}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {log.user.firstName} {log.user.lastName}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Entity
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{log.entityType}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">{log.entityId.slice(0, 8)}…</p>
                      </div>
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Time
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatDate(log.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{log.ipAddress ?? 'No IP recorded'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Time', 'User', 'Action', 'Entity', 'IP'].map((h) => (
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
                  {logs.map((log: typeof logs[0]) => (
                    <tr key={log.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        {log.user.firstName} {log.user.lastName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-medium text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        <span className="font-medium">{log.entityType}</span>
                        <span className="ml-1 font-mono text-xs text-slate-400">
                          {log.entityId.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-400">
                        {log.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))}
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
