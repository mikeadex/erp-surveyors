import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { CreateBranchSchema } from '@valuation-os/utils'

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const branches = await req.db.branch.findMany({
      select: {
        id: true, firmId: true, name: true, address: true,
        city: true, state: true, phone: true, isActive: true, createdAt: true,
      },
      orderBy: { name: 'asc' },
    })
    return ok(branches)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const body = CreateBranchSchema.parse(await req.json())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branch = await req.db.branch.create({
      data: body as any,
      select: {
        id: true, firmId: true, name: true, address: true,
        city: true, state: true, phone: true, isActive: true, createdAt: true,
      },
    })
    return created(branch)
  } catch (err) {
    return errorResponse(err)
  }
}))
