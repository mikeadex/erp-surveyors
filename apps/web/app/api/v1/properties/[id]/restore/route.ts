import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'

export const POST = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params as { id: string }

    const existing = await req.db.property.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true },
    })
    if (!existing) throw Errors.NOT_FOUND('Property')

    await req.db.property.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    })

    return ok({ message: 'Property restored' })
  } catch (err) {
    return errorResponse(err)
  }
}))
