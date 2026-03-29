import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { UpdatePropertySchema } from '@valuation-os/utils'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params

    const property = await req.db.property.findUnique({
      where: { id },
      include: {
        cases: {
          select: {
            id: true, reference: true, stage: true,
            valuationType: true, isOverdue: true, createdAt: true,
            client: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { cases: true } },
      },
    })

    if (!property) throw Errors.NOT_FOUND('Property')
    return ok(property)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const body = UpdatePropertySchema.parse(await req.json())

    const existing = await req.db.property.findUnique({ where: { id } })
    if (!existing) throw Errors.NOT_FOUND('Property')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    await req.db.property.updateMany({
      where: { id },
      data: data as Record<string, unknown>,
    })
    const property = await req.db.property.findUnique({ where: { id } })
    if (!property) throw Errors.NOT_FOUND('Property')
    return ok(property)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const DELETE = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params as { id: string }

    const existing = await req.db.property.findUnique({
      where: { id },
      include: { _count: { select: { cases: true } } },
    })
    if (!existing) throw Errors.NOT_FOUND('Property')
    if (existing._count.cases > 0) throw Errors.CONFLICT('Cannot delete a property with active cases')

    await req.db.property.deleteMany({ where: { id } })
    return ok({ message: 'Property deleted' })
  } catch (err) {
    return errorResponse(err)
  }
}))
