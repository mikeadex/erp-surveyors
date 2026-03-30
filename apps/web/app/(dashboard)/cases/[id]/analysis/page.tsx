import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { Header } from '@/components/layout/header'
import { AnalysisWorkbench } from '@/components/analysis/analysis-workbench'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { rankComparablesForProperty } from '@/lib/properties/property-records'

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
        property: { select: { address: true, city: true, state: true, propertyUse: true, tenureType: true } },
        analysis: true,
        reports: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        caseComparables: {
          select: {
            id: true,
            weight: true,
            relevanceScore: true,
            adjustmentAmount: true,
            adjustmentNote: true,
            comparable: {
              select: {
                id: true,
                comparableType: true,
                address: true,
                salePrice: true,
                rentalValue: true,
                propertyUse: true,
                pricePerSqm: true,
                transactionDate: true,
                source: true,
                isVerified: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ])

  if (!user) redirect('/login')
  if (!caseRecord) notFound()

  const suggestedComparables = rankComparablesForProperty(
    {
      city: caseRecord.property.city,
      state: caseRecord.property.state,
      propertyUse: caseRecord.property.propertyUse,
      tenureType: caseRecord.property.tenureType,
    },
    await prisma.comparable.findMany({
      where: { firmId: session.firmId },
      select: {
        id: true,
        comparableType: true,
        address: true,
        city: true,
        state: true,
        propertyUse: true,
        tenureType: true,
        salePrice: true,
        rentalValue: true,
        transactionDate: true,
        isVerified: true,
        createdAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    }),
  )
    .filter((candidate) => !caseRecord.caseComparables.some((attached) => attached.comparable.id === candidate.id))
    .slice(0, 8)

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
          suggestedComparables={suggestedComparables}
          hasReports={caseRecord.reports.length > 0}
        />
      </div>
    </>
  )
}
