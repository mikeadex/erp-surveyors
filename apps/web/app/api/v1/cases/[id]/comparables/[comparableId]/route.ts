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
    const { id, comparableId } = await ctx.params as { id: string; comparableId: string }
    const body = UpdateSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const existing = await prisma.caseComparable.findFirst({
      where: { caseId: id, comparableId },
      select: { id: true },
    })
    if (!existing) throw Errors.NOT_FOUND('Comparable link')

    const data = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined))
    const updated = await prisma.caseComparable.update({
      where: { id: existing.id },
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
    requireRole(req.session.role, ['managing_partner', 'valuer', 'admin'])
    const { id, comparableId } = await ctx.params as { id: string; comparableId: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const existing = await prisma.caseComparable.findFirst({
      where: { caseId: id, comparableId },
      select: { id: true },
    })
    if (!existing) throw Errors.NOT_FOUND('Comparable link')

    await prisma.caseComparable.delete({ where: { id: existing.id } })
    return ok({ message: 'Comparable removed from case' })
  } catch (err) {
    return errorResponse(err)
  }
})
