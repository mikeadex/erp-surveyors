import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    if (!['managing_partner'].includes(req.session.role)) {
      throw Errors.FORBIDDEN()
    }

    const { skip, take, page, pageSize } = parsePagination(req)
    const params = req.nextUrl.searchParams
    const entityType = params.get('entityType')
    const userId = params.get('userId')

    const where = {
      firmId: req.session.firmId,
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true, action: true, entityType: true, entityId: true,
          before: true, after: true, ipAddress: true, createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
})
