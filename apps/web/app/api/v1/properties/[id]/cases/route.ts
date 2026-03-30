import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination } from '@/lib/api/pagination'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const { skip, take, page, pageSize } = parsePagination(req)

    const property = await req.db.property.findFirst({ where: { id, deletedAt: null } })
    if (!property) throw Errors.NOT_FOUND('Property')

    const [items, total] = await Promise.all([
      req.db.case.findMany({
        where: { propertyId: id },
        select: {
          id: true, reference: true, stage: true, valuationType: true,
          dueDate: true, isOverdue: true, createdAt: true,
          client: { select: { id: true, name: true } },
          assignedValuer: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.case.count({ where: { propertyId: id } }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))
