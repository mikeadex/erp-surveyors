import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { CreatePropertySchema } from '@valuation-os/utils'

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const params = req.nextUrl.searchParams
    const state = params.get('state')
    const propertyUse = params.get('propertyUse')

    const where = {
      ...(state ? { state } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(propertyUse ? { propertyUse: propertyUse as any } : {}),
      ...(search
        ? {
            OR: [
              { address: { contains: search, mode: 'insensitive' as const } },
              { city: { contains: search, mode: 'insensitive' as const } },
              { state: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      req.db.property.findMany({
        where,
        select: {
          id: true, address: true, city: true, state: true,
          localGovernment: true, propertyUse: true, tenureType: true,
          plotSize: true, plotSizeUnit: true, createdAt: true,
          _count: { select: { cases: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.property.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const body = CreatePropertySchema.parse(await req.json())

    const property = await req.db.property.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...(body as any), createdById: req.session.userId },
      select: {
        id: true, address: true, city: true, state: true,
        propertyUse: true, tenureType: true, createdAt: true,
      },
    })
    return created(property)
  } catch (err) {
    return errorResponse(err)
  }
}))
