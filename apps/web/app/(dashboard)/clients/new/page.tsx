import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAccessToken } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { Header } from '@/components/layout/header'
import { NewClientForm } from '@/components/clients/new-client-form'
import { canAccessAllBranches } from '@/lib/auth/branch-scope'

export default async function NewClientPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.branch.findMany({
      where: { firmId: session.firmId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  if (!user) redirect('/login')

  const visibleBranches = canAccessAllBranches(session.role)
    ? branches
    : branches.filter((branch) => branch.id === session.branchId)
  const initialClientBranchId =
    session.branchId ?? (visibleBranches.length === 1 ? visibleBranches[0]?.id : undefined)

  return (
    <>
      <Header user={user} title="New Client" />
      <div className="p-6 max-w-2xl">
        <NewClientForm
          branches={visibleBranches}
          initialBranchId={initialClientBranchId}
          canSelectBranch={canAccessAllBranches(session.role)}
        />
      </div>
    </>
  )
}
