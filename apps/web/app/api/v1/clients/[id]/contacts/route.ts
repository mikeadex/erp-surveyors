import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'

const CreateContactSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  isPrimary: z.boolean().optional(),
})

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const client = await req.db.client.findUnique({ where: { id } })
    if (!client) throw Errors.NOT_FOUND('Client')

    const contacts = await prisma.contact.findMany({
      where: { clientId: id },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    })

    return ok(contacts)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const body = CreateContactSchema.parse(await req.json())

    const client = await req.db.client.findUnique({ where: { id } })
    if (!client) throw Errors.NOT_FOUND('Client')

    if (body.isPrimary) {
      await prisma.contact.updateMany({
        where: { clientId: id, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const contact = await prisma.contact.create({
      data: {
        clientId: id,
        name: body.name,
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        isPrimary: body.isPrimary ?? false,
      },
    })

    return ok(contact, 201)
  } catch (err) {
    return errorResponse(err)
  }
}))
