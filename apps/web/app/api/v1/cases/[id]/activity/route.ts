import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const scopedBranchId = await resolveScopedBranchId(req.session)
    const { skip, take, page, pageSize } = parsePagination(req)

    const caseRecord = await prisma.case.findFirst({
      where: {
        id,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const where = {
      firmId: req.session.firmId,
      entityType: 'Case',
      entityId: id,
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          before: true,
          after: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
})
