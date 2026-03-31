import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { UpdatePropertySchema } from '@valuation-os/utils'
import { normalizePropertyPayload } from '@/lib/properties/property-records'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params

    const property = await req.db.property.findFirst({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
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
    const normalized = normalizePropertyPayload(body)

    const existing = await req.db.property.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw Errors.NOT_FOUND('Property')

    let nextClientId: string | null | undefined

    if (body.clientId !== undefined) {
      if (body.clientId) {
        const client = await req.db.client.findFirst({
          where: {
            id: body.clientId,
            firmId: req.firmId,
            deletedAt: null,
          },
          select: { id: true },
        })
        if (!client) throw Errors.BAD_REQUEST('Selected client does not belong to your firm')
        nextClientId = body.clientId
      }
      else {
        nextClientId = null
      }
    }

    const data = Object.fromEntries(Object.entries(normalized).filter(([, v]) => v !== undefined))
    await req.db.property.updateMany({
      where: { id, deletedAt: null },
      data: {
        ...(data as Record<string, unknown>),
        ...(body.clientId !== undefined ? { clientId: nextClientId ?? null } : {}),
      },
    })
    const property = await req.db.property.findFirst({
      where: { id, deletedAt: null },
      include: { client: { select: { id: true, name: true } } },
    })
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

    const existing = await req.db.property.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { cases: true } } },
    })
    if (!existing) throw Errors.NOT_FOUND('Property')
    if (existing._count.cases > 0) throw Errors.CONFLICT('Cannot delete a property with active cases')

    await req.db.property.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    return ok({ message: 'Property archived' })
  } catch (err) {
    return errorResponse(err)
  }
}))
