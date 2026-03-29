import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { CreateContactSchema } from '@valuation-os/utils'
import { normalizeClientContacts } from '@/lib/crm/client-records'
import { assertRecordBranchAccess } from '@/lib/auth/branch-scope'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const client = await req.db.client.findUnique({ where: { id, deletedAt: null } })
    if (!client) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, client.branchId, 'client')

    const contacts = await prisma.contact.findMany({
      where: { clientId: id, client: { firmId: req.firmId, deletedAt: null } },
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
    const body = normalizeClientContacts([CreateContactSchema.parse(await req.json())])[0]

    const client = await req.db.client.findUnique({ where: { id, deletedAt: null } })
    if (!client) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, client.branchId, 'client')

    const existingContacts = await prisma.contact.count({
      where: { clientId: id, client: { firmId: req.firmId, deletedAt: null } },
    })

    if (body.isPrimary || existingContacts === 0) {
      await prisma.contact.updateMany({
        where: { clientId: id, isPrimary: true, client: { firmId: req.firmId, deletedAt: null } },
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
        isPrimary: body.isPrimary || existingContacts === 0,
      },
    })

    return ok(contact, 201)
  } catch (err) {
    return errorResponse(err)
  }
}))
