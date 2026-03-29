import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const { skip, take, page, pageSize } = parsePagination(req)

    const client = await req.db.client.findUnique({ where: { id } })
    if (!client) throw Errors.NOT_FOUND('Client')

    const [items, total] = await Promise.all([
      req.db.case.findMany({
        where: { clientId: id },
        select: {
          id: true, reference: true, stage: true, valuationType: true,
          dueDate: true, isOverdue: true, createdAt: true,
          property: { select: { id: true, address: true, city: true, state: true } },
          assignedValuer: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.case.count({ where: { clientId: id } }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))
