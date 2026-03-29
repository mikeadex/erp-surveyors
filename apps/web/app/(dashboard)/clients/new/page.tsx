import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAccessToken } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { Header } from '@/components/layout/header'
import { NewClientForm } from '@/components/clients/new-client-form'

export default async function NewClientPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  return (
    <>
      <Header user={user} title="New Client" />
      <div className="p-6 max-w-2xl">
        <NewClientForm />
      </div>
    </>
  )
}
