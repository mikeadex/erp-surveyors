import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { z } from 'zod'

const AttachSchema = z.object({
  comparableId: z.string().uuid(),
  weight: z.number().optional(),
})

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
      include: {
        comparable: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok(items)
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id } = await ctx.params as { id: string }
    const body = AttachSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const comparable = await prisma.comparable.findFirst({
      where: { id: body.comparableId, firmId: req.session.firmId },
    })
    if (!comparable) throw Errors.NOT_FOUND('Comparable')

    const existing = await prisma.caseComparable.findFirst({
      where: { caseId: id, comparableId: body.comparableId },
    })
    if (existing) throw Errors.CONFLICT('Comparable already attached to this case')

    const item = await prisma.caseComparable.create({
      data: {
        caseId: id,
        comparableId: body.comparableId,
        addedById: req.session.userId,
        ...(body.weight !== undefined ? { weight: body.weight } : {}),
      },
      include: { comparable: true },
    })

    return ok(item, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
