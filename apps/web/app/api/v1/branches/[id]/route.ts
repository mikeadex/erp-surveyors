import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { Errors } from '@/lib/api/errors'
import { UpdateBranchSchema } from '@valuation-os/utils'

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params
    const body = UpdateBranchSchema.parse(await req.json())

    const existing = await req.db.branch.findUnique({ where: { id } })
    if (!existing) throw Errors.NOT_FOUND('Branch')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    await req.db.branch.updateMany({
      where: { id },
      data: data as Record<string, unknown>,
    })
    const branch = await req.db.branch.findUnique({
      where: { id },
      select: {
        id: true, name: true, address: true, city: true,
        state: true, phone: true, isActive: true, updatedAt: true,
      },
    })
    if (!branch) throw Errors.NOT_FOUND('Branch')
    return ok(branch)
  } catch (err) {
    return errorResponse(err)
  }
}))
