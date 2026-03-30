import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/guards'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

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
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, caseId },
      include: {
        case: { select: { id: true, reference: true, stage: true } },
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
    requireRole(req.session.role, ['managing_partner', 'valuer', 'field_officer'])
    const { id: caseId, inspectionId } = await ctx.params as { id: string; inspectionId: string }
    const body = UpdateInspectionSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true, branchId: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, caseId },
      select: {
        id: true,
        status: true,
        inspectionDate: true,
        occupancy: true,
        conditionSummary: true,
        notes: true,
      },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')
    if (inspection.status === 'submitted') throw Errors.CONFLICT('Submitted inspections cannot be edited')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    const updated = await prisma.inspection.update({
      where: { id: inspectionId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      select: {
        id: true,
        status: true,
        inspectionDate: true,
        occupancy: true,
        notes: true,
        conditionSummary: true,
        updatedAt: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        firmId: req.session.firmId,
        userId: req.session.userId,
        action: 'CASE_INSPECTION_UPDATED',
        entityType: 'Case',
        entityId: caseId,
        before: {
          inspectionDate: inspection.inspectionDate?.toISOString() ?? null,
          occupancy: inspection.occupancy,
          conditionSummary: inspection.conditionSummary,
          notes: inspection.notes,
        } as any,
        after: {
          inspectionDate: updated.inspectionDate?.toISOString() ?? null,
          occupancy: updated.occupancy,
          conditionSummary: updated.conditionSummary,
          notes: updated.notes,
          branchId: caseRecord.branchId,
        } as any,
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
