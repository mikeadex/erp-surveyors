import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { z } from 'zod'

const UpdateSchema = z.object({
  weight: z.number().optional(),
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id, compId } = await ctx.params as { id: string; compId: string }
    const body = UpdateSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const item = await prisma.caseComparable.findFirst({
      where: { id: compId, caseId: id },
    })
    if (!item) throw Errors.NOT_FOUND('Case comparable')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    const updated = await prisma.caseComparable.update({
      where: { id: compId },
      data,
      include: { comparable: true },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})

export const DELETE = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id, compId } = await ctx.params as { id: string; compId: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const item = await prisma.caseComparable.findFirst({
      where: { id: compId, caseId: id },
    })
    if (!item) throw Errors.NOT_FOUND('Case comparable')

    await prisma.caseComparable.delete({ where: { id: compId } })
    return ok({ message: 'Comparable detached from case' })
  } catch (err) {
    return errorResponse(err)
  }
})
