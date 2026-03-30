import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { LinkComparableSchema } from '@valuation-os/utils'

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

    const created = await prisma.caseComparable.create({
      data: {
        caseId: id,
        comparableId: body.comparableId,
        addedById: req.session.userId,
        ...(body.weight !== undefined ? { weight: body.weight } : {}),
      },
      include: {
        comparable: {
          select: {
            id: true,
            address: true,
            salePrice: true,
            rentalValue: true,
            propertyUse: true,
          },
        },
      },
    })

    return ok(created, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
