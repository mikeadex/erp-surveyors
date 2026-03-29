import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { UpdateContactSchema } from '@valuation-os/utils'
import { assertRecordBranchAccess } from '@/lib/auth/branch-scope'

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id, cid } = await ctx.params as { id: string; cid: string }
    const body = UpdateContactSchema.parse(await req.json())

    const client = await req.db.client.findUnique({ where: { id, deletedAt: null } })
    if (!client) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, client.branchId, 'client')

    const contact = await prisma.contact.findFirst({
      where: { id: cid, clientId: id, client: { firmId: req.firmId, deletedAt: null } },
    })
    if (!contact) throw Errors.NOT_FOUND('Contact')

    if (body.isPrimary) {
      await prisma.contact.updateMany({
        where: { clientId: id, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const updateData: Record<string, string | boolean> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.role !== undefined) updateData.role = body.role?.trim() || ''
    if (body.email !== undefined) updateData.email = body.email?.trim().toLowerCase() || ''
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || ''
    if (body.isPrimary !== undefined) updateData.isPrimary = body.isPrimary

    const updated = await prisma.contact.update({
      where: { id: cid },
      data: Object.fromEntries(
        Object.entries(updateData).map(([key, value]) => [key, value === '' ? null : value]),
      ),
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const DELETE = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id, cid } = await ctx.params as { id: string; cid: string }

    const client = await req.db.client.findUnique({ where: { id, deletedAt: null } })
    if (!client) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, client.branchId, 'client')

    const contact = await prisma.contact.findFirst({
      where: { id: cid, clientId: id, client: { firmId: req.firmId, deletedAt: null } },
    })
    if (!contact) throw Errors.NOT_FOUND('Contact')

    await prisma.contact.delete({ where: { id: cid } })
    if (contact.isPrimary) {
      const nextPrimary = await prisma.contact.findFirst({
        where: { clientId: id, client: { firmId: req.firmId, deletedAt: null } },
        orderBy: { name: 'asc' },
        select: { id: true },
      })

      if (nextPrimary) {
        await prisma.contact.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        })
      }
    }
    return ok({ message: 'Contact removed' })
  } catch (err) {
    return errorResponse(err)
  }
}))
