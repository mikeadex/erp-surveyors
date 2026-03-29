import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { AnalysisWorkbench } from '@/components/analysis/analysis-workbench'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const [user, caseRecord] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    }),
    prisma.case.findFirst({
      where: { id: caseId, firmId: session.firmId },
      select: {
        id: true, reference: true, stage: true,
        property: { select: { address: true, city: true, state: true } },
        analysis: true,
        caseComparables: {
          include: { comparable: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ])

  if (!user) redirect('/login')
  if (!caseRecord) notFound()

  return (
    <>
      <Header user={user} title={`Workbench — ${caseRecord.reference}`} />
      <div className="p-6 max-w-5xl space-y-4">
        <Link
          href={`/cases/${caseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to case
        </Link>

        <AnalysisWorkbench
          caseId={caseId}
          analysis={caseRecord.analysis ?? null}
          comparables={caseRecord.caseComparables}
        />
      </div>
    </>
  )
}
