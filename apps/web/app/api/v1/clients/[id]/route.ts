import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { UpdateClientSchema } from '@valuation-os/utils'
import { requireRole } from '@/lib/auth/guards'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params

    const client = await req.db.client.findUnique({
      where: { id },
      include: {
        contacts: {
          select: { id: true, name: true, role: true, email: true, phone: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        },
        cases: {
          select: {
            id: true, reference: true, stage: true, valuationType: true,
            createdAt: true, isOverdue: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { cases: true } },
      },
    })

    if (!client) throw Errors.NOT_FOUND('Client')
    return ok(client)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params
    const body = UpdateClientSchema.parse(await req.json())

    const existing = await req.db.client.findUnique({ where: { id } })
    if (!existing) throw Errors.NOT_FOUND('Client')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    await req.db.client.updateMany({
      where: { id },
      data: data as Record<string, unknown>,
    })
    const client = await req.db.client.findUnique({
      where: { id },
      select: {
        id: true, type: true, name: true, email: true,
        phone: true, updatedAt: true,
      },
    })
    if (!client) throw Errors.NOT_FOUND('Client')
    return ok(client)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const DELETE = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params as { id: string }

    const existing = await req.db.client.findUnique({
      where: { id },
      include: { _count: { select: { cases: true } } },
    })
    if (!existing) throw Errors.NOT_FOUND('Client')
    if (existing._count.cases > 0) throw Errors.CONFLICT('Cannot delete a client with active cases')

    await prisma.contact.deleteMany({ where: { clientId: id } })
    await req.db.client.deleteMany({ where: { id } })
    return ok({ message: 'Client deleted' })
  } catch (err) {
    return errorResponse(err)
  }
}))
