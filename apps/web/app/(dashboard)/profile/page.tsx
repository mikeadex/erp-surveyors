import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { ProfileForm } from '@/components/profile/profile-form'
import { formatDate, ROLE_LABELS } from '@valuation-os/utils'
import type { UserRole } from '@valuation-os/types'

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, firstName: true, lastName: true, email: true, role: true,
      isActive: true, lastLoginAt: true, createdAt: true,
      branch: { select: { name: true } },
    },
  })
  if (!user) redirect('/login')

  return (
    <>
      <Header user={user} title="My Profile" />
      <div className="p-6 max-w-2xl space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500">{ROLE_LABELS[user.role as UserRole]}</p>
              {user.branch && (
                <p className="text-xs text-gray-400">{user.branch.name}</p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-4">
            <div>
              <dt className="text-xs text-gray-500">Email</dt>
              <dd className="text-gray-800 mt-0.5">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Status</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Last Login</dt>
              <dd className="text-gray-700 mt-0.5">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Member Since</dt>
              <dd className="text-gray-700 mt-0.5">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <ProfileForm
          userId={user.id}
          defaultValues={{ firstName: user.firstName, lastName: user.lastName }}
        />
      </div>
    </>
  )
}
