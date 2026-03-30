import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { Errors } from '@/lib/api/errors'
import { errorResponse, ok } from '@/lib/api/response'
import { prisma } from '@/lib/db/prisma'

export const GET = withAuth(withTenant(async (
  req: TenantRequest,
  ctx: { params: Promise<{ jobId: string }> },
) => {
  try {
    const { jobId } = await ctx.params

    const job = await prisma.comparableImportJob.findFirst({
      where: {
        id: jobId,
        firmId: req.session.firmId,
      },
    })

    if (!job) {
      throw Errors.NOT_FOUND('Import job')
    }

    return ok({ job })
  } catch (err) {
    return errorResponse(err)
  }
}))
