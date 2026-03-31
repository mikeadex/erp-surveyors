import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { errorResponse, ok } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { syncOverdueWorkflowState } from '@/lib/notifications/overdue'

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])

    const result = await syncOverdueWorkflowState()

    return ok({
      message: 'Overdue workflow sync complete',
      ...result,
    })
  } catch (err) {
    return errorResponse(err)
  }
})

