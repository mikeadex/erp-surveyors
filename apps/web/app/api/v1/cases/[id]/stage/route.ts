import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors, AppError } from '@/lib/api/errors'
import { isValidTransition, STAGE_TRANSITION_RULES } from '@valuation-os/utils'
import type { CaseStage } from '@valuation-os/types'
import { z } from 'zod'

const StageTransitionSchema = z.object({
  stage: z.string().min(1),
  note: z.string().optional(),
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params
    const body = StageTransitionSchema.parse(await req.json())

    const existing = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: {
        id: true,
        reference: true,
        stage: true,
        dueDate: true,
        assignedValuerId: true,
        assignedReviewerId: true,
        inspection: { select: { status: true } },
        caseComparables: { select: { id: true }, take: 1 },
        analysis: { select: { status: true } },
        reports: {
          select: { status: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
        invoice: { select: { id: true, status: true } },
      },
    })
    if (!existing) throw Errors.NOT_FOUND('Case')

    if (!isValidTransition(existing.stage as Parameters<typeof isValidTransition>[0], body.stage as Parameters<typeof isValidTransition>[1])) {
      throw new AppError(
        'INVALID_TRANSITION',
        `Cannot transition from '${existing.stage}' to '${body.stage}'`,
        422,
      )
    }

    const rules = STAGE_TRANSITION_RULES[body.stage as CaseStage]
    const validationErrors: string[] = []

    if (rules?.requires?.includes('dueDate') && !existing.dueDate) {
      validationErrors.push('A due date is required before moving to this stage')
    }
    if (rules?.requires?.includes('assignedValuerId') && !existing.assignedValuerId) {
      validationErrors.push('An assigned valuer is required before moving to this stage')
    }
    if (rules?.requires?.includes('assignedReviewerId') && !existing.assignedReviewerId) {
      validationErrors.push('An assigned reviewer is required before moving to this stage')
    }
    if (rules?.requiresInspectionSubmitted && existing.inspection?.status !== 'submitted') {
      validationErrors.push('Inspection must be submitted before moving to this stage')
    }
    if (rules?.requiresComparables && existing.caseComparables.length === 0) {
      validationErrors.push('At least one comparable is required before moving to this stage')
    }
    if (rules?.requiresAnalysisComplete && existing.analysis?.status !== 'complete') {
      validationErrors.push('Analysis must be completed before moving to this stage')
    }
    if (rules?.requiresReportDraft && existing.reports[0]?.status !== 'draft') {
      validationErrors.push('A draft report is required before moving to this stage')
    }
    if (
      rules?.requiresReportApproved &&
      !['approved', 'final'].includes(existing.reports[0]?.status ?? '')
    ) {
      validationErrors.push('An approved report is required before moving to this stage')
    }
    if (rules?.requiresInvoice && !existing.invoice) {
      validationErrors.push('An invoice is required before moving to this stage')
    }
    if (rules?.requiresPayment && existing.invoice?.status !== 'paid') {
      validationErrors.push('A paid invoice is required before moving to this stage')
    }

    if (validationErrors.length > 0) {
      throw Errors.VALIDATION(
        Object.fromEntries(validationErrors.map((message, index) => [`stage_${index}`, [message]])),
      )
    }

    const [updated] = await prisma.$transaction([
      prisma.case.update({
        where: { id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { stage: body.stage as any },
        select: { id: true, reference: true, stage: true, updatedAt: true },
      }),
      prisma.auditLog.create({
        data: {
          firmId: req.session.firmId,
          userId: req.session.userId,
          action: 'CASE_STAGE_CHANGED',
          entityType: 'Case',
          entityId: id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          after: { from: existing.stage, to: body.stage, note: body.note } as any,
        },
      }),
    ])

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
