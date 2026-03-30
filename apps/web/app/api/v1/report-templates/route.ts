import { z } from 'zod'
import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { getDefaultReportTemplateHtml } from '@/lib/reports/report-renderer'

const TemplateSchema = z.object({
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

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const templates = await prisma.reportTemplate.findMany({
      where: { firmId: req.session.firmId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    })

    return ok(templates)
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const body = TemplateSchema.parse(await req.json())

    const templateHtml = body.templateHtml?.trim() || getDefaultReportTemplateHtml()
    const defaultAssumptions = buildTemplateItems(body.defaultAssumptions)
    const defaultDisclaimers = buildTemplateItems(body.defaultDisclaimers)

    if (body.isActive) {
      await prisma.reportTemplate.updateMany({
        where: { firmId: req.session.firmId, isActive: true },
        data: { isActive: false },
      })
    }

    const template = await prisma.reportTemplate.create({
      data: {
        firmId: req.session.firmId,
        name: body.name,
        valuationType: body.valuationType,
        templateHtml,
        defaultAssumptions,
        defaultDisclaimers,
        isActive: body.isActive,
        createdById: req.session.userId,
      },
    })

    return ok(template, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
