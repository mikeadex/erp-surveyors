import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { CreateComparableSchema } from '@valuation-os/utils'
import { buildComparableSearchWhere, normalizeComparablePayload } from '@/lib/comparables/comparable-records'

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const params = req.nextUrl.searchParams
    const comparableType = params.get('comparableType')
    const state = params.get('state')

    const where = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(comparableType ? { comparableType: comparableType as any } : {}),
      ...(state ? { state } : {}),
      ...(buildComparableSearchWhere(search) ?? {}),
    }

    const [items, total] = await Promise.all([
      req.db.comparable.findMany({
        where,
        select: {
          id: true, comparableType: true, address: true, city: true,
          state: true, salePrice: true, rentalValue: true, transactionDate: true,
          plotSize: true, buildingSize: true, pricePerSqm: true, source: true, notes: true, isVerified: true, createdAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.comparable.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const body = CreateComparableSchema.parse(await req.json())
    const normalized = normalizeComparablePayload(body)

    const comparable = await req.db.comparable.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...(normalized as any), addedById: req.session.userId },
      select: {
        id: true, comparableType: true, address: true, city: true,
        state: true, createdAt: true,
      },
    })
    return created(comparable)
  } catch (err) {
    return errorResponse(err)
  }
}))
