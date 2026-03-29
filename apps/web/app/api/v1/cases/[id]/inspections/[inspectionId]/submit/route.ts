import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer', 'field_officer'])
    const { id: caseId, inspectionId } = await ctx.params as { id: string; inspectionId: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, firmId: req.session.firmId },
      select: { id: true, stage: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, caseId },
    })
    if (!inspection) throw Errors.NOT_FOUND('Inspection')
    if (inspection.status === 'submitted') throw Errors.CONFLICT('Inspection already submitted')

    const updated = await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
      select: { id: true, status: true, submittedAt: true },
    })

    if (caseRecord.stage === 'inspection_scheduled') {
      await prisma.case.update({
        where: { id: caseId },
        data: { stage: 'inspection_completed' },
      })
    }

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
