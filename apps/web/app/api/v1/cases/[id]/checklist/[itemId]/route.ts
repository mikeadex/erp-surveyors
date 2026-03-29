import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'

const ToggleSchema = z.object({
  isChecked: z.boolean(),
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, itemId } = await ctx.params as { id: string; itemId: string }
    const { isChecked } = ToggleSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const item = await prisma.caseChecklistItem.findFirst({
      where: { id: itemId, caseId: id },
    })
    if (!item) throw Errors.NOT_FOUND('Checklist item')

    const updated = await prisma.caseChecklistItem.update({
      where: { id: itemId },
      data: {
        isChecked,
        ...(isChecked
          ? { checkedById: req.session.userId, checkedAt: new Date() }
          : { checkedById: null, checkedAt: null }),
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})

export const DELETE = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, itemId } = await ctx.params as { id: string; itemId: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const item = await prisma.caseChecklistItem.findFirst({
      where: { id: itemId, caseId: id },
    })
    if (!item) throw Errors.NOT_FOUND('Checklist item')

    await prisma.caseChecklistItem.delete({ where: { id: itemId } })
    return ok({ message: 'Checklist item deleted' })
  } catch (err) {
    return errorResponse(err)
  }
})
