import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { canAccessAllBranches, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { Header } from '@/components/layout/header'
import { formatDate, ROLE_LABELS, initials } from '@valuation-os/utils'
import type { UserRole } from '@valuation-os/types'
import { TeamActions } from '@/components/team/team-actions'
import { UserActionsMenu } from '@/components/team/user-actions-menu'
import { BranchFilter } from '@/components/ui/branch-filter'

interface SearchParams {
  branchId?: string
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
      },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, branchId: true, isActive: true, lastLoginAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    }),
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <BranchFilter branches={branches} />
        </div>
        {/* Branch overview */}
        {branches.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {branches.map((b: { id: string; name: string }) => (
              <div key={b.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {allUsers.filter((u: { branch: { id: string } | null }) => u.branch?.id === b.id).length} members
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Users table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              {allUsers.length} team {allUsers.length === 1 ? 'member' : 'members'}
            </h2>
            {canManage && <TeamActions branches={branches} />}
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Member', 'Role', 'Branch', 'Last Login', 'Status', ''].map((h) => (
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
              {allUsers.map((u: typeof allUsers[0]) => (
                <tr key={u.id} className={`${!u.isActive ? 'opacity-50' : ''} hover:bg-gray-50`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700">
                          {initials(u.firstName, u.lastName)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                          {u.id === session.userId && (
                            <span className="ml-1.5 text-xs text-gray-400">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {ROLE_LABELS[u.role as UserRole]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {u.branch?.name ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
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
    </>
  )
}
