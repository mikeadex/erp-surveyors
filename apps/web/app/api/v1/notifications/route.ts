import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { parsePagination } from '@/lib/api/pagination'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true'

    const where = {
      userId: req.session.userId,
      firmId: req.session.firmId,
      ...(unreadOnly ? { readAt: null } : {}),
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true, type: true, title: true, body: true,
          readAt: true, createdAt: true, entityType: true, entityId: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.session.userId, firmId: req.session.firmId, readAt: null },
      }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize), unreadCount })
  } catch (err) {
    return errorResponse(err)
  }
})
