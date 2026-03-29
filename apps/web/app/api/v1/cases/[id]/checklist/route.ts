import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const items = await prisma.caseChecklistItem.findMany({
      where: { caseId: id },
      orderBy: { label: 'asc' },
    })

    return ok(items)
  } catch (err) {
    return errorResponse(err)
  }
})

const CreateChecklistItemSchema = z.object({
  label: z.string().min(1).max(300),
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const { label } = CreateChecklistItemSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const item = await prisma.caseChecklistItem.create({
      data: { caseId: id, label },
    })

    return ok(item, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
