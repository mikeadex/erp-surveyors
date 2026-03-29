import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { z } from 'zod'

const CreateAnalysisSchema = z.object({
  method: z.enum(['sales_comparison', 'income_capitalisation', 'discounted_cash_flow', 'cost', 'profits', 'residual']),
  basisOfValue: z.enum(['market_value', 'fair_value', 'investment_value', 'liquidation_value']),
  assumptions: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  specialAssumptions: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  concludedValue: z.number().positive().optional(),
  valuationDate: z.string().datetime().optional(),
})

const UpdateAnalysisSchema = CreateAnalysisSchema.partial().extend({
  comparableGrid: z.record(z.unknown()).optional(),
})

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const analysis = await prisma.valuationAnalysis.findUnique({
      where: { caseId: id },
    })

    return ok(analysis)
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id } = await ctx.params as { id: string }
    const body = CreateAnalysisSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const existing = await prisma.valuationAnalysis.findUnique({ where: { caseId: id } })
    if (existing) throw Errors.CONFLICT('Analysis already exists for this case')

    const analysis = await prisma.valuationAnalysis.create({
      data: {
        caseId: id,
        firmId: req.session.firmId,
        method: body.method,
        basisOfValue: body.basisOfValue,
        assumptions: body.assumptions ?? [],
        specialAssumptions: body.specialAssumptions ?? [],
        createdById: req.session.userId,
        ...(body.concludedValue !== undefined ? { concludedValue: body.concludedValue } : {}),
        ...(body.valuationDate !== undefined ? { valuationDate: new Date(body.valuationDate) } : {}),
      },
    })

    return ok(analysis, 201)
  } catch (err) {
    return errorResponse(err)
  }
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'valuer'])
    const { id } = await ctx.params as { id: string }
    const body = UpdateAnalysisSchema.parse(await req.json())

    const caseRecord = await prisma.case.findFirst({
      where: { id, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const existing = await prisma.valuationAnalysis.findUnique({ where: { caseId: id } })
    if (!existing) throw Errors.NOT_FOUND('Analysis')

    const data: Record<string, unknown> = {}
    if (body.method !== undefined) data.method = body.method
    if (body.basisOfValue !== undefined) data.basisOfValue = body.basisOfValue
    if (body.assumptions !== undefined) data.assumptions = body.assumptions
    if (body.specialAssumptions !== undefined) data.specialAssumptions = body.specialAssumptions
    if (body.comparableGrid !== undefined) data.comparableGrid = body.comparableGrid
    if (body.concludedValue !== undefined) data.concludedValue = body.concludedValue
    if (body.valuationDate !== undefined) data.valuationDate = new Date(body.valuationDate)

    const updated = await prisma.valuationAnalysis.update({
      where: { caseId: id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
