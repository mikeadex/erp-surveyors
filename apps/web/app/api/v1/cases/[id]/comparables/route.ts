import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { created, ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { LinkComparableSchema } from '@valuation-os/utils'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const items = await prisma.caseComparable.findMany({
      where: { caseId: id },
      orderBy: [{ createdAt: 'asc' }],
      include: {
        comparable: {
          select: {
            id: true,
            comparableType: true,
            address: true,
            city: true,
            state: true,
            propertyUse: true,
            salePrice: true,
            rentalValue: true,
            pricePerSqm: true,
            transactionDate: true,
            source: true,
            isVerified: true,
          },
        },
      },
    })

    return ok({ items })
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer', 'admin'])
    const { id } = await ctx.params as { id: string }
    const body = LinkComparableSchema.parse(await req.json())

    const [caseRecord, comparable] = await Promise.all([
      prisma.case.findFirst({
        where: { id, firmId: req.session.firmId },
        select: { id: true },
      }),
      prisma.comparable.findFirst({
        where: { id: body.comparableId, firmId: req.session.firmId },
        select: { id: true },
      }),
    ])

    if (!caseRecord) throw Errors.NOT_FOUND('Case')
    if (!comparable) throw Errors.NOT_FOUND('Comparable')

    const existing = await prisma.caseComparable.findFirst({
      where: { caseId: id, comparableId: body.comparableId },
      select: { id: true },
    })
    if (existing) throw Errors.CONFLICT('Comparable is already attached to this case')

    const createdLink = await prisma.caseComparable.create({
      data: {
        caseId: id,
        comparableId: body.comparableId,
        addedById: req.session.userId,
        ...(body.weight !== undefined ? { weight: body.weight } : {}),
        ...(body.relevanceScore !== undefined ? { relevanceScore: body.relevanceScore } : {}),
        ...(body.adjustmentAmount !== undefined ? { adjustmentAmount: body.adjustmentAmount } : {}),
        ...(body.adjustmentNote !== undefined ? { adjustmentNote: body.adjustmentNote || null } : {}),
      },
      include: {
        comparable: {
          select: {
            id: true,
            comparableType: true,
            address: true,
            salePrice: true,
            rentalValue: true,
            propertyUse: true,
            pricePerSqm: true,
            source: true,
            isVerified: true,
          },
        },
      },
    })

    return created(createdLink)
  } catch (err) {
    return errorResponse(err)
  }
})
