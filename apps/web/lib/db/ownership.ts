import { prisma } from '@/lib/db/prisma'
import { Errors } from '@/lib/api/errors'
import type { UserRole } from '@valuation-os/types'

export async function assertBranchBelongsToFirm(branchId: string, firmId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, firmId },
    select: { id: true },
  })

  if (!branch) throw Errors.BAD_REQUEST('Selected branch does not belong to your firm')
}

export async function assertClientBelongsToFirm(clientId: string, firmId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, firmId },
    select: { id: true },
  })

  if (!client) throw Errors.BAD_REQUEST('Selected client does not belong to your firm')
}

export async function assertPropertyBelongsToFirm(propertyId: string, firmId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, firmId },
    select: { id: true },
  })

  if (!property) throw Errors.BAD_REQUEST('Selected property does not belong to your firm')
}

export async function assertUserBelongsToFirm(
  userId: string,
  firmId: string,
  label: string,
  allowedRoles?: UserRole[],
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      firmId,
      ...(allowedRoles ? { role: { in: allowedRoles } } : {}),
    },
    select: { id: true },
  })

  if (!user) throw Errors.BAD_REQUEST(`Selected ${label} does not belong to your firm`)
}

export async function assertCaseAndClientBelongToFirm(
  caseId: string,
  clientId: string,
  firmId: string,
) {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, firmId },
    select: { id: true, clientId: true },
  })

  if (!caseRecord) throw Errors.BAD_REQUEST('Selected case does not belong to your firm')
  if (caseRecord.clientId !== clientId) {
    throw Errors.BAD_REQUEST('Selected client does not match the chosen case')
  }
}

export async function assertActiveSessionUser(userId: string, firmId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, firmId, isActive: true },
    select: {
      id: true,
      firmId: true,
      passwordHash: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
      expoPushToken: true,
    },
  })

  if (!user) throw Errors.UNAUTHORIZED()
  return user
}
