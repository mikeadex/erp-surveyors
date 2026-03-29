import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAccessToken } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { Sidebar } from '@/components/layout/sidebar'

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

  const firm = await prisma.firm.findUnique({
    where: { id: session.firmId },
    select: { name: true },
  })

  if (!firm) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={session.role} firmName={firm.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
