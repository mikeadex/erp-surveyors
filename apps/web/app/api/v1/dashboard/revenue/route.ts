import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'finance'])
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [paidThisMonth, paidThisYear, unpaid, overdue, byStatus] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          firmId: req.session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'paid',
          paidAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          firmId: req.session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'paid',
          paidAt: { gte: startOfYear },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          firmId: req.session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: { in: ['sent', 'partial'] },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          firmId: req.session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'overdue',
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: {
          firmId: req.session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ])

    return ok({
      paidThisMonth: {
        amount: paidThisMonth._sum.totalAmount?.toString() ?? '0',
        count: paidThisMonth._count,
      },
      paidThisYear: {
        amount: paidThisYear._sum.totalAmount?.toString() ?? '0',
        count: paidThisYear._count,
      },
      unpaid: {
        amount: unpaid._sum.totalAmount?.toString() ?? '0',
        count: unpaid._count,
      },
      overdue: {
        amount: overdue._sum.totalAmount?.toString() ?? '0',
        count: overdue._count,
      },
      byStatus: byStatus.map(row => ({
        status: row.status,
        count: row._count,
        total: row._sum.totalAmount?.toString() ?? '0',
      })),
    })
  } catch (err) {
    return errorResponse(err)
  }
})
