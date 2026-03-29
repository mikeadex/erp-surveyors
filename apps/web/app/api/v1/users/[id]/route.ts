import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { Errors } from '@/lib/api/errors'
import { UpdateUserSchema } from '@valuation-os/utils'
import { resolveManagedUserBranchId, resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const user = await req.db.user.findUnique({
      where: { id, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      select: {
        id: true, firmId: true, branchId: true, email: true,
        firstName: true, lastName: true, phone: true, role: true,
        isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
      },
    })
    if (!user) throw Errors.NOT_FOUND('User')
    return ok(user)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params
    const body = UpdateUserSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const existing = await req.db.user.findUnique({
      where: { id, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
    })
    if (!existing) throw Errors.NOT_FOUND('User')
    if (body.role && req.session.role !== 'managing_partner') {
      throw Errors.FORBIDDEN('Only managing partners can change user roles')
    }
    const nextRole = body.role ?? existing.role
    const nextBranchId = body.role !== undefined || body.branchId !== undefined
      ? await resolveManagedUserBranchId(req.session, nextRole, body.branchId ?? existing.branchId)
      : existing.branchId

    const data = Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== undefined),
    )
    await prisma.user.updateMany({
      where: {
        id,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      data: {
        ...data,
        ...(body.role !== undefined || body.branchId !== undefined ? { branchId: nextBranchId } : {}),
      },
    })

    if (body.role && body.role !== existing.role) {
      await prisma.auditLog.create({
        data: {
          firmId: req.session.firmId,
          userId: req.session.userId,
          action: 'USER_ROLE_CHANGED',
          entityType: 'User',
          entityId: id,
          before: { role: existing.role },
          after: { role: body.role },
        },
      })
    }

    return ok({ message: 'User updated' })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const DELETE = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner'])
    const { id } = await ctx.params

    if (id === req.session.userId) {
      throw Errors.CONFLICT('Cannot deactivate your own account')
    }

    const existing = await req.db.user.findUnique({
      where: { id },
    })
    if (!existing) throw Errors.NOT_FOUND('User')

    await prisma.user.updateMany({
      where: { id, firmId: req.session.firmId },
      data: { isActive: false, refreshToken: null, refreshTokenExpiresAt: null },
    })

    return ok({ message: 'User deactivated' })
  } catch (err) {
    return errorResponse(err)
  }
}))
