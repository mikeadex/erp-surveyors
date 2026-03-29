import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { resolveManagedUserBranchId } from '@/lib/auth/branch-scope'
import { z } from 'zod'

const RoleChangeSchema = z.object({
  role: z.enum(['managing_partner', 'reviewer', 'valuer', 'admin', 'finance', 'field_officer']),
})

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner'])
    const { id } = await ctx.params as { id: string }
    const { role } = RoleChangeSchema.parse(await req.json())

    if (id === req.session.userId) {
      throw Errors.CONFLICT('Cannot change your own role')
    }

    const user = await prisma.user.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true, role: true, branchId: true, isActive: true },
    })
    if (!user) throw Errors.NOT_FOUND('User')
    if (!user.isActive) throw Errors.CONFLICT('Cannot change role of a deactivated user')
    if (user.role === role) throw Errors.CONFLICT(`User already has the ${role} role`)

    const nextBranchId = await resolveManagedUserBranchId(req.session, role, user.branchId)
    
    const updated = await prisma.user.updateMany({
      where: { id, firmId: req.session.firmId },
      data: { role, branchId: nextBranchId },
    })

    if (updated.count === 0) throw Errors.NOT_FOUND('User')

    await prisma.auditLog.create({
      data: {
        firmId: req.session.firmId,
        userId: req.session.userId,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: id,
        before: { role: user.role },
        after: { role },
      },
    })

    const refreshed = await prisma.user.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    if (!refreshed) throw Errors.NOT_FOUND('User')

    return ok(refreshed)
  } catch (err) {
    return errorResponse(err)
  }
}))
