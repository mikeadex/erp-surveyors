import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { FirmSettingsForm } from '@/components/settings/firm-settings-form'
import { BranchSection } from '@/components/settings/branch-section'
import { SystemReadinessPanel } from '@/components/settings/system-readiness-panel'
import { buildRuntimeReadinessSnapshot } from '@/lib/env/runtime-readiness'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  if (!['managing_partner'].includes(session.role)) redirect('/dashboard')

  const [user, firm, branches, reportsInReview, overdueCases, overdueInvoices, pendingUploads] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.firm.findUnique({
      where: { id: session.firmId },
      select: {
        id: true, name: true, slug: true, rcNumber: true, esvarNumber: true,
        address: true, city: true, state: true, phone: true, email: true, logoKey: true,
      },
    }),
    prisma.branch.findMany({
      where: { firmId: session.firmId },
      select: {
        id: true, name: true, address: true, city: true,
        state: true, phone: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.report.count({
      where: { firmId: session.firmId, status: 'submitted_for_review' },
    }),
    prisma.case.count({
      where: { firmId: session.firmId, isOverdue: true },
    }),
    prisma.invoice.count({
      where: { firmId: session.firmId, status: 'overdue' },
    }),
    prisma.document.count({
      where: { firmId: session.firmId, deletedAt: null, confirmedAt: null },
    }),
  ])

  if (!user || !firm) redirect('/login')
  const readiness = buildRuntimeReadinessSnapshot()

  return (
    <>
      <Header user={user} title="Firm Settings" />
      <div className="p-6 max-w-3xl space-y-8">
        <SystemReadinessPanel
          checks={readiness.checks}
          productionReady={readiness.productionReady}
          metrics={{
            reportsInReview,
            overdueCases,
            overdueInvoices,
            pendingUploads,
          }}
        />

        <FirmSettingsForm firm={firm} />

        <BranchSection branches={branches} />
      </div>
    </>
  )
}
