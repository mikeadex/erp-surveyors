import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { requireRole } from '@/lib/auth/guards'
import { InviteUserSchema } from '@valuation-os/utils'
import { hashPassword } from '@/lib/auth/password'
import { prisma } from '@/lib/db/prisma'
import { resolveManagedUserBranchId, resolveScopedBranchId } from '@/lib/auth/branch-scope'
import crypto from 'crypto'

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const where = search
      ? {
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : scopedBranchId ? { branchId: scopedBranchId } : {}

    const [items, total] = await Promise.all([
      req.db.user.findMany({
        where,
        select: {
          id: true, firmId: true, branchId: true, email: true,
          firstName: true, lastName: true, role: true, isActive: true,
          lastLoginAt: true, createdAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.user.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const body = InviteUserSchema.parse(await req.json())
    const branchId = await resolveManagedUserBranchId(req.session, body.role, body.branchId ?? null)

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
    if (existing) {
      return errorResponse(Object.assign(new Error('Email already registered'), { code: 'CONFLICT', statusCode: 409 }))
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        firmId: req.firmId,
        branchId,
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(crypto.randomBytes(16).toString('hex')),
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        invitedById: req.session.userId,
        invitationToken: token,
        invitationExpiresAt: expiresAt,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    return created({ user, invitationToken: token })
  } catch (err) {
    return errorResponse(err)
  }
}))
