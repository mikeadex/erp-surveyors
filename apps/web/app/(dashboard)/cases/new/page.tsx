import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { canAccessAllBranches } from '@/lib/auth/branch-scope'
import { Header } from '@/components/layout/header'
import { NewCaseForm } from '@/components/cases/new-case-form'

export default async function NewCasePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, clients, properties, valuers, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.client.findMany({
      where: {
        firmId: session.firmId,
        deletedAt: null,
        ...(session.branchId && !canAccessAllBranches(session.role) ? { branchId: session.branchId } : {}),
      },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
    prisma.property.findMany({
      where: { firmId: session.firmId },
      select: { id: true, clientId: true, address: true, city: true, state: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      where: {
        firmId: session.firmId,
        isActive: true,
        ...(session.branchId && !canAccessAllBranches(session.role) ? { branchId: session.branchId } : {}),
        role: { in: ['valuer', 'reviewer', 'managing_partner'] },
      },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: 'asc' },
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

  return (
    <>
      <Header user={user} title="New Case" />
      <div className="p-6 max-w-3xl">
        <NewCaseForm
          clients={clients}
          properties={properties}
          valuers={valuers}
          branches={visibleBranches}
        />
      </div>
    </>
  )
}
