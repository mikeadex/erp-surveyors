import type { UserRole } from '@valuation-os/types'
import { AppError } from '@/lib/api/errors'

export function requireRole(
  userRole: UserRole,
  allowed: UserRole[],
): void {
  if (!allowed.includes(userRole)) {
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action', 403)
  }
}

export function requireAnyRole(
  userRole: UserRole,
  ...allowed: UserRole[]
): void {
  requireRole(userRole, allowed)
}

export const ROLES = {
  MANAGING_PARTNER: 'managing_partner' as UserRole,
  REVIEWER: 'reviewer' as UserRole,
  VALUER: 'valuer' as UserRole,
  ADMIN: 'admin' as UserRole,
  FINANCE: 'finance' as UserRole,
  FIELD_OFFICER: 'field_officer' as UserRole,
} as const

export const ROLE_GROUPS = {
  ADMIN_ROLES: ['managing_partner', 'admin'] as UserRole[],
  VALUATION_ROLES: ['managing_partner', 'reviewer', 'valuer'] as UserRole[],
  FINANCE_ROLES: ['managing_partner', 'finance'] as UserRole[],
  ALL_ROLES: [
    'managing_partner', 'reviewer', 'valuer', 'admin', 'finance', 'field_officer',
  ] as UserRole[],
}
