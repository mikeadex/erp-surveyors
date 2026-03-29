import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'

const UpdateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  isPrimary: z.boolean().optional(),
})

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id, cid } = await ctx.params as { id: string; cid: string }
    const body = UpdateContactSchema.parse(await req.json())

    const client = await req.db.client.findUnique({ where: { id } })
    if (!client) throw Errors.NOT_FOUND('Client')

    const contact = await prisma.contact.findFirst({
      where: { id: cid, clientId: id, client: { firmId: req.firmId } },
    })
    if (!contact) throw Errors.NOT_FOUND('Contact')

    if (body.isPrimary) {
      await prisma.contact.updateMany({
        where: { clientId: id, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const updated = await prisma.contact.update({
      where: { id: cid },
      data: Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)),
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const DELETE = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id, cid } = await ctx.params as { id: string; cid: string }

    const client = await req.db.client.findUnique({ where: { id } })
    if (!client) throw Errors.NOT_FOUND('Client')

    const contact = await prisma.contact.findFirst({
      where: { id: cid, clientId: id, client: { firmId: req.firmId } },
    })
    if (!contact) throw Errors.NOT_FOUND('Contact')

    await prisma.contact.delete({ where: { id: cid } })
    return ok({ message: 'Contact removed' })
  } catch (err) {
    return errorResponse(err)
  }
}))
