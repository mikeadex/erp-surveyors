import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { CreateClientSchema } from '@valuation-os/utils'

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const type = req.nextUrl.searchParams.get('type')

    const where = {
      ...(type ? { type: type as 'individual' | 'corporate' } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      req.db.client.findMany({
        where,
        select: {
          id: true, type: true, name: true, email: true,
          phone: true, city: true, state: true, createdAt: true,
          _count: { select: { cases: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.client.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const body = CreateClientSchema.parse(await req.json())

    const client = await req.db.client.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...(body as any), createdById: req.session.userId },
      select: {
        id: true, type: true, name: true, email: true,
        phone: true, createdAt: true,
      },
    })
    return created(client)
  } catch (err) {
    return errorResponse(err)
  }
}))
