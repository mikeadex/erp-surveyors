import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { Header } from '@/components/layout/header'
import { formatDate, ROLE_LABELS, initials } from '@valuation-os/utils'
import type { UserRole } from '@valuation-os/types'
import { TeamActions } from '@/components/team/team-actions'
import { TeamFiltersBar } from '@/components/team/team-filters-bar'
import { UserActionsMenu } from '@/components/team/user-actions-menu'

interface SearchParams {
  branchId?: string
  search?: string
}

interface TeamMemberRow {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  branchId: string | null
  isActive: boolean
  lastLoginAt: string | Date | null
  branch?: { id: string; name: string } | null
}

export default async function TeamPage({
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
  const search = params.search?.trim()
  const scopedBranchId = await resolveScopedBranchId(session, params.branchId ?? null)

  const [user, allUsers, allBranches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        firmId: session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { branch: { name: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, branchId: true, isActive: true, lastLoginAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    }) as Promise<TeamMemberRow[]>,
    prisma.branch.findMany({
      where: { firmId: session.firmId, isActive: true },
      select: { id: true, name: true },
    }),
  ])

  if (!user) redirect('/login')

  const branches = canAccessAllBranches(session.role)
    ? allBranches
    : allBranches.filter((branch) => branch.id === session.branchId)
  const canChangeRole = session.role === 'managing_partner'
  const canManage = ['managing_partner', 'admin'].includes(session.role)

  return (
    <>
      <Header user={user} title="Team" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Team Directory
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Manage branch staffing, access roles, and team coverage.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep team membership clear by branch while staying aligned with the calmer operating shell.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
              {canManage && <TeamActions branches={branches} />}
            </div>
          </div>
        </section>

        <TeamFiltersBar
          search={search}
          branchId={scopedBranchId ?? undefined}
          canAccessAllBranches={canAccessAllBranches(session.role)}
          branches={branches}
        />

        <div className="space-y-4">
          <div className="surface-card flex items-center justify-between rounded-[24px] px-4 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Team Roster
              </p>
              <h2 className="mt-2 text-base font-semibold text-slate-900">
                {allUsers.length} team {allUsers.length === 1 ? 'member' : 'members'}
              </h2>
            </div>
          </div>

          <div className="space-y-3 xl:hidden">
            {allUsers.map((u) => (
              <div
                key={u.id}
                className={`surface-card rounded-[28px] p-4 sm:p-5 ${!u.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-semibold text-brand-700">
                    {initials(u.firstName, u.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-slate-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="mt-0.5 break-all text-sm text-slate-500">{u.email}</p>
                        {u.id === session.userId ? (
                          <p className="mt-1 text-xs text-slate-400">You</p>
                        ) : null}
                      </div>
                      {canManage ? (
                        <UserActionsMenu
                          userId={u.id}
                          currentRole={u.role as UserRole}
                          currentBranchId={u.branchId}
                          isActive={u.isActive}
                          isSelf={u.id === session.userId}
                          branches={branches}
                          canChangeRole={canChangeRole}
                        />
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Role
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {ROLE_LABELS[u.role as UserRole]}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Branch
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {u.branch?.name ?? 'Firm-wide'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-slate-400">
                        Last login {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          u.isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  {['Member', 'Role', 'Branch', 'Last Login', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className={`${!u.isActive ? 'opacity-60' : ''} hover:bg-slate-50/70`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-50">
                          <span className="text-xs font-semibold text-brand-700">
                            {initials(u.firstName, u.lastName)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {u.firstName} {u.lastName}
                            {u.id === session.userId && (
                              <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {ROLE_LABELS[u.role as UserRole]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {u.branch?.name ?? 'Firm-wide'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      {canManage && (
                        <UserActionsMenu
                          userId={u.id}
                          currentRole={u.role as UserRole}
                          currentBranchId={u.branchId}
                          isActive={u.isActive}
                          isSelf={u.id === session.userId}
                          branches={branches}
                          canChangeRole={canChangeRole}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
