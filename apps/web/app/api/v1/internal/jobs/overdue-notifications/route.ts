import { NextRequest } from 'next/server'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { syncOverdueWorkflowState } from '@/lib/notifications/overdue'

function assertCronSecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw Errors.BAD_REQUEST('CRON_SECRET is not configured for overdue sync jobs')
  }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const headerSecret = req.headers.get('x-cron-secret')
  if (bearer !== secret && headerSecret !== secret) {
    throw Errors.UNAUTHORIZED()
  }
}

async function handle(req: NextRequest) {
  try {
    assertCronSecret(req)
    const result = await syncOverdueWorkflowState()
    return ok({
      message: 'Overdue workflow sync complete',
      ...result,
    })
  } catch (err) {
    return errorResponse(err)
  }
}

export const GET = handle
export const POST = handle
