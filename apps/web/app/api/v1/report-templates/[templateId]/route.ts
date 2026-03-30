import { z } from 'zod'
import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { getDefaultReportTemplateHtml } from '@/lib/reports/report-renderer'

const UpdateTemplateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  valuationType: z.enum([
    'market',
    'rental',
    'mortgage',
    'insurance',
    'probate',
    'commercial',
    'land',
  ]),
  templateHtml: z.string().optional(),
  defaultAssumptions: z.array(z.string().trim().min(1).max(400)).default([]),
  defaultDisclaimers: z.array(z.string().trim().min(1).max(400)).default([]),
  isActive: z.boolean().default(true),
})

function buildTemplateItems(items: string[]) {
  return items.map((text) => ({
    id: crypto.randomUUID(),
    text,
  }))
}

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { templateId } = await ctx.params as { templateId: string }

    const template = await prisma.reportTemplate.findFirst({
      where: { id: templateId, firmId: req.session.firmId },
    })
    if (!template) throw Errors.NOT_FOUND('Report template')

    return ok(template)
  } catch (err) {
    return errorResponse(err)
  }
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { templateId } = await ctx.params as { templateId: string }
    const body = UpdateTemplateSchema.parse(await req.json())

    const existing = await prisma.reportTemplate.findFirst({
      where: { id: templateId, firmId: req.session.firmId },
      select: { id: true },
    })
    if (!existing) throw Errors.NOT_FOUND('Report template')

    if (body.isActive) {
      await prisma.reportTemplate.updateMany({
        where: { firmId: req.session.firmId, isActive: true, NOT: { id: templateId } },
        data: { isActive: false },
      })
    }

    const template = await prisma.reportTemplate.update({
      where: { id: templateId },
      data: {
        name: body.name,
        valuationType: body.valuationType,
        templateHtml: body.templateHtml?.trim() || getDefaultReportTemplateHtml(),
        defaultAssumptions: buildTemplateItems(body.defaultAssumptions),
        defaultDisclaimers: buildTemplateItems(body.defaultDisclaimers),
        isActive: body.isActive,
      },
    })

    return ok(template)
  } catch (err) {
    return errorResponse(err)
  }
})
