import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { FileText, BarChart3, TrendingUp, Clock } from 'lucide-react'

export default async function ReportsPage() {
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

  const REPORT_TYPES = [
    {
      icon: FileText,
      title: 'Valuation Report',
      description: 'Generate a full valuation report for any case in final issued stage.',
      color: 'text-blue-600 bg-blue-50',
      available: false,
    },
    {
      icon: BarChart3,
      title: 'Portfolio Summary',
      description: 'Aggregated view of all active cases, stages, and fee totals.',
      color: 'text-purple-600 bg-purple-50',
      available: false,
    },
    {
      icon: TrendingUp,
      title: 'Comparable Market Analysis',
      description: 'Statistical summary of comparable sales and rentals by area.',
      color: 'text-green-600 bg-green-50',
      available: false,
    },
    {
      icon: Clock,
      title: 'Turnaround Time Report',
      description: 'Average time per stage across all cases in a date range.',
      color: 'text-orange-600 bg-orange-50',
      available: false,
    },
  ]

  return (
    <>
      <Header user={user} title="Reports" />
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm text-blue-700 font-medium">Reports are coming soon</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Automated report generation will be available in the next release.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORT_TYPES.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="rounded-xl border border-gray-200 bg-white p-5 opacity-60 cursor-not-allowed"
            >
              <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-xs text-gray-500">{description}</p>
              <span className="mt-3 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
