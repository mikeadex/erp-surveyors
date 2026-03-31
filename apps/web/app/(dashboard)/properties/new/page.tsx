import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { NewPropertyForm } from '@/components/properties/new-property-form'

export default async function NewPropertyPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, clients] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.client.findMany({
      where: { firmId: session.firmId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
  ])
  if (!user) redirect('/login')

  return (
    <>
      <Header user={user} title="Add Property" />
      <div className="p-6 max-w-2xl">
        <NewPropertyForm clients={clients} />
      </div>
    </>
  )
}
