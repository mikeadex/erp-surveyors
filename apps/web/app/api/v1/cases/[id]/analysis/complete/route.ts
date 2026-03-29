import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id } = await ctx.params as { id: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const analysis = await prisma.valuationAnalysis.findUnique({ where: { caseId: id } })
    if (!analysis) throw Errors.NOT_FOUND('Analysis')

    const validationErrors: string[] = []
    if (!analysis.method) validationErrors.push('Valuation method is required')
    if (!analysis.basisOfValue) validationErrors.push('Basis of value is required')
    if (!analysis.concludedValue) validationErrors.push('Concluded value is required and must be > 0')
    if (!analysis.valuationDate) validationErrors.push('Valuation date is required')

    if (validationErrors.length > 0) {
      throw Errors.VALIDATION(
        Object.fromEntries(validationErrors.map((e, i) => [`error_${i}`, [e]])),
      )
    }

    const updated = await prisma.valuationAnalysis.update({
      where: { caseId: id },
      data: { status: 'complete' },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
