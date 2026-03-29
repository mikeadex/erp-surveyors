import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'

const UpdateInspectionSchema = z.object({
  inspectionDate: z.string().datetime().optional(),
  externalCondition: z.string().optional(),
  internalCondition: z.string().optional(),
  services: z.string().optional(),
  conditionSummary: z.string().optional(),
  locationDescription: z.string().optional(),
  occupancy: z.string().max(100).optional(),
  notes: z.string().optional(),
  offlineDraft: z.record(z.unknown()).optional(),
})

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id: caseId, inspectionId } = await ctx.params

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, caseId },
      include: {
        inspector: { select: { id: true, firstName: true, lastName: true } },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')
    return ok(inspection)
  } catch (err) {
    return errorResponse(err)
  }
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id: caseId, inspectionId } = await ctx.params as { id: string; inspectionId: string }
    const body = UpdateInspectionSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, caseId },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')
    if (inspection.status === 'submitted') throw Errors.CONFLICT('Submitted inspections cannot be edited')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    const updated = await prisma.inspection.update({
      where: { id: inspectionId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      select: { id: true, status: true, notes: true, conditionSummary: true, updatedAt: true },
    })
    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
