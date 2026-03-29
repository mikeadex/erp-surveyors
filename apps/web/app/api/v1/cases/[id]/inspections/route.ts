import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, created, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { CreateInspectionSchema } from '@valuation-os/utils'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.findUnique({
      where: { caseId: id },
      include: {
        inspector: { select: { id: true, firstName: true, lastName: true } },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return ok(inspection)
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id: caseId } = await ctx.params
    const body = CreateInspectionSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...(body as any), caseId, inspectedById: req.session.userId, firmId: req.session.firmId },
      include: {
        inspector: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return created(inspection)
  } catch (err) {
    return errorResponse(err)
  }
})
