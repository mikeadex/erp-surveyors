import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'

export const GET = withAuth(async (
  req: AuthedRequest,
  ctx: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await ctx.params

    const comparable = await prisma.comparable.findFirst({
      where: {
        id,
        firmId: req.session.firmId,
      },
      select: {
        id: true,
        comparableType: true,
        address: true,
        city: true,
        state: true,
        propertyUse: true,
        tenureType: true,
        transactionDate: true,
        salePrice: true,
        rentalValue: true,
        plotSize: true,
        plotSizeUnit: true,
        buildingSize: true,
        buildingSizeUnit: true,
        pricePerSqm: true,
        source: true,
        sourceContact: true,
        notes: true,
        isVerified: true,
        createdAt: true,
      },
    })

    if (!comparable) {
      throw Errors.NOT_FOUND('Comparable')
    }

    return ok(comparable)
  } catch (err) {
    return errorResponse(err)
  }
})
