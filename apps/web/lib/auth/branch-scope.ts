import type { AuthSession, UserRole } from '@valuation-os/types'
import { Errors } from '@/lib/api/errors'
import { assertBranchBelongsToFirm } from '@/lib/db/ownership'

const CROSS_BRANCH_ROLES: UserRole[] = ['managing_partner']

export function canAccessAllBranches(role: UserRole): boolean {
  return CROSS_BRANCH_ROLES.includes(role)
}

export async function resolveScopedBranchId(
  session: AuthSession,
  requestedBranchId?: string | null,
): Promise<string | undefined> {
  if (requestedBranchId) {
    await assertBranchBelongsToFirm(requestedBranchId, session.firmId)
  }

  if (canAccessAllBranches(session.role)) {
    return requestedBranchId ?? undefined
  }

  if (session.branchId) {
    if (requestedBranchId && requestedBranchId !== session.branchId) {
      throw Errors.FORBIDDEN('You can only access records in your assigned branch')
    }
    return session.branchId
  }

  throw Errors.FORBIDDEN('Your account must be assigned to a branch to access branch-scoped records')
}

export function assertRecordBranchAccess(
  session: AuthSession,
  recordBranchId?: string | null,
  entityLabel = 'record',
) {
  if (canAccessAllBranches(session.role)) return

  if (!session.branchId) {
    throw Errors.FORBIDDEN('Your account must be assigned to a branch to access branch-scoped records')
  }

  if (!recordBranchId || recordBranchId !== session.branchId) {
    throw Errors.FORBIDDEN(`You can only access ${entityLabel}s in your assigned branch`)
  }
}

export async function resolveManagedClientBranchId(
  session: AuthSession,
  requestedBranchId?: string | null,
): Promise<string> {
  const branchId = await resolveScopedBranchId(session, requestedBranchId)
  if (!branchId) {
    throw Errors.BAD_REQUEST('A branch assignment is required for clients')
  }

  await assertBranchBelongsToFirm(branchId, session.firmId)
  return branchId
}

export function requiresAssignedBranch(role: UserRole): boolean {
  return role !== 'managing_partner'
}

export async function resolveManagedUserBranchId(
  session: AuthSession,
  targetRole: UserRole,
  requestedBranchId?: string | null,
): Promise<string | null> {
  if (!requiresAssignedBranch(targetRole)) {
    if (requestedBranchId) {
      throw Errors.BAD_REQUEST('Managing partners should not be assigned to a branch')
    }
    return null
  }

  const branchId = await resolveScopedBranchId(session, requestedBranchId)
  if (!branchId) {
    throw Errors.BAD_REQUEST('A branch assignment is required for this role')
  }

  await assertBranchBelongsToFirm(branchId, session.firmId)
  return branchId
}
