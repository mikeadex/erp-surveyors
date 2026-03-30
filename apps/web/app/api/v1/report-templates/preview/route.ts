import { z } from 'zod'
import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { ok, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { getDefaultReportTemplateHtml, renderReportTemplatePreview } from '@/lib/reports/report-renderer'

const PreviewSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  valuationType: z.enum([
    'market',
    'rental',
    'mortgage',
    'insurance',
    'probate',
    'commercial',
    'land',
  ]).optional(),
  templateHtml: z.string().optional(),
  defaultDisclaimers: z.array(z.string().trim().min(1).max(400)).default([]),
})

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const body = PreviewSchema.parse(await req.json())

    const html = renderReportTemplatePreview({
      templateName: body.name ?? 'Template Preview',
      valuationType: body.valuationType ?? 'market',
      templateHtml: body.templateHtml?.trim() || getDefaultReportTemplateHtml(),
      templateDefaultDisclaimers: body.defaultDisclaimers.map((text) => ({
        id: crypto.randomUUID(),
        text,
      })),
    })

    return ok({ html })
  } catch (err) {
    return errorResponse(err)
  }
})
