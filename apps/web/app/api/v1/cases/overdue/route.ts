import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    if (!['managing_partner', 'admin'].includes(req.session.role)) {
      throw Errors.FORBIDDEN()
    }

    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const where = {
      firmId: req.session.firmId,
      isOverdue: true,
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' as const } },
              { client: { name: { contains: search, mode: 'insensitive' as const } } },
              { property: { address: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where,
        select: {
          id: true,
          reference: true,
          stage: true,
          valuationType: true,
          dueDate: true,
          isOverdue: true,
          createdAt: true,
          client: { select: { id: true, name: true } },
          property: { select: { id: true, address: true, state: true } },
          assignedValuer: { select: { id: true, firstName: true, lastName: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.case.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
})
