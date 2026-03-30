import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAccessToken } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) redirect('/login')

  let session
  try {
    session = await verifyAccessToken(token)
  } catch {
    redirect('/login')
  }

  const [firm, user] = await Promise.all([
    prisma.firm.findUnique({
      where: { id: session.firmId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true },
    }),
  ])

  if (!firm || !user) redirect('/login')

  return (
    <DashboardShell
      userRole={session.role}
      firmName={firm.name}
      userFirstName={user.firstName}
      userLastName={user.lastName}
    >
      {children}
    </DashboardShell>
  )
}
