import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const firmId = req.session.firmId
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const [
      activeCases,
      overdueCount,
      pendingReview,
      totalClients,
      invoicesThisMonth,
      upcomingInspections,
    ] = await Promise.all([
      prisma.case.count({
        where: {
          firmId,
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
          stage: { notIn: ['archived', 'payment_received'] },
        },
      }),
      prisma.case.count({
        where: { firmId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}), isOverdue: true },
      }),
      prisma.case.count({
        where: { firmId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}), stage: 'review' },
      }),
      prisma.client.count({
        where: scopedBranchId
          ? { firmId, cases: { some: { branchId: scopedBranchId } } }
          : { firmId },
      }),
      prisma.invoice.aggregate({
        where: {
          firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'paid',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { totalAmount: true },
      }),
      prisma.case.count({
        where: {
          firmId,
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
          stage: 'inspection_scheduled',
          inspection: { status: 'draft' },
        },
      }),
    ])

    return ok({
      activeCases,
      overdueCount,
      pendingReview,
      totalClients,
      revenueThisMonth: invoicesThisMonth._sum.totalAmount ?? 0,
      upcomingInspections,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
