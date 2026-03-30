import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const rows = await prisma.case.groupBy({
      by: ['stage'],
      where: {
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      _count: { id: true },
      orderBy: { stage: 'asc' },
    })

    return ok({
      items: rows.map((row) => ({
        stage: row.stage,
        count: row._count.id,
      })),
    })
  } catch (err) {
    return errorResponse(err)
  }
})
