import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { rankComparablesForProperty } from '@/lib/properties/property-records'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const property = await req.db.property.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        city: true,
        state: true,
        propertyUse: true,
        tenureType: true,
      },
    })
    if (!property) throw Errors.NOT_FOUND('Property')

    const comparableCandidates = await req.db.comparable.findMany({
      where: {
        state: { equals: property.state, mode: 'insensitive' },
      },
      select: {
        id: true,
        comparableType: true,
        address: true,
        city: true,
        state: true,
        propertyUse: true,
        tenureType: true,
        salePrice: true,
        rentalValue: true,
        transactionDate: true,
        isVerified: true,
        createdAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    })

    const items = rankComparablesForProperty(
      {
        city: property.city,
        state: property.state,
        propertyUse: property.propertyUse,
        tenureType: property.tenureType,
      },
      comparableCandidates,
    ).slice(0, 10)

    return ok({ items, total: items.length })
  } catch (err) {
    return errorResponse(err)
  }
}))
