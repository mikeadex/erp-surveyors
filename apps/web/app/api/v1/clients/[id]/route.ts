import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { UpdateClientSchema } from '@valuation-os/utils'
import { requireRole } from '@/lib/auth/guards'
import { findClientDuplicateMatches, normalizeClientTags, normalizeClientText } from '@/lib/crm/client-records'
import { assertRecordBranchAccess, resolveManagedClientBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params

    const client = await req.db.client.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        contacts: {
          select: { id: true, name: true, role: true, email: true, phone: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        },
        cases: {
          select: {
            id: true, reference: true, stage: true, valuationType: true,
            createdAt: true, isOverdue: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { cases: true } },
      },
    })

    if (!client) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, client.branchId, 'client')
    return ok(client)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params
    const body = UpdateClientSchema.parse(await req.json())

    const existing = await req.db.client.findUnique({ where: { id, deletedAt: null } })
    if (!existing) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, existing.branchId, 'client')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    const patchData: Record<string, unknown> = { ...data }
    if ('branchId' in patchData) {
      patchData.branchId = await resolveManagedClientBranchId(req.session, body.branchId ?? null)
    }
    if ('email' in patchData && typeof patchData.email === 'string') {
      patchData.email = patchData.email.trim().toLowerCase()
    }
    if ('phone' in patchData && typeof patchData.phone === 'string') {
      patchData.phone = patchData.phone.trim()
    }
    if ('address' in patchData) patchData.address = normalizeClientText(body.address) ?? null
    if ('city' in patchData) patchData.city = normalizeClientText(body.city) ?? null
    if ('state' in patchData) patchData.state = normalizeClientText(body.state) ?? null
    if ('rcNumber' in patchData) patchData.rcNumber = normalizeClientText(body.rcNumber) ?? null
    if ('notes' in patchData) patchData.notes = normalizeClientText(body.notes) ?? null
    if ('tags' in patchData) {
      patchData.tags = normalizeClientTags(body.tags)
    }

    const duplicateCandidates = await req.db.client.findMany({
      where: {
        deletedAt: null,
        NOT: { id },
      },
      select: {
        id: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        rcNumber: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    })

    const duplicateMatches = findClientDuplicateMatches(
      {
        name: String(patchData.name ?? existing.name),
        email: typeof patchData.email === 'string' ? patchData.email : existing.email ?? undefined,
        phone: typeof patchData.phone === 'string' ? patchData.phone : existing.phone ?? undefined,
        rcNumber: typeof patchData.rcNumber === 'string' ? patchData.rcNumber : existing.rcNumber ?? undefined,
      },
      duplicateCandidates,
    )

    await req.db.client.updateMany({
      where: { id, deletedAt: null },
      data: patchData,
    })
    const client = await req.db.client.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, branchId: true, type: true, name: true, email: true,
        phone: true, rcNumber: true, notes: true, tags: true, updatedAt: true,
      },
    })
    if (!client) throw Errors.NOT_FOUND('Client')
    return ok({ ...client, duplicateMatches })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const DELETE = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    const { id } = await ctx.params as { id: string }

    const existing = await req.db.client.findUnique({
      where: { id, deletedAt: null },
      include: { _count: { select: { cases: true } } },
    })
    if (!existing) throw Errors.NOT_FOUND('Client')
    assertRecordBranchAccess(req.session, existing.branchId, 'client')
    if (existing._count.cases > 0) throw Errors.CONFLICT('Cannot delete a client with active cases')

    await req.db.client.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    return ok({ message: 'Client archived' })
  } catch (err) {
    return errorResponse(err)
  }
}))
