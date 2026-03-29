import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { CreateClientSchema } from '@valuation-os/utils'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildClientSearchWhere,
  findClientDuplicateMatches,
  normalizeClientContacts,
  normalizeClientTags,
  normalizeClientText,
} from '@/lib/crm/client-records'
import { resolveManagedClientBranchId, resolveScopedBranchId } from '@/lib/auth/branch-scope'

const CreateClientRequestSchema = CreateClientSchema.extend({
  allowDuplicate: z.boolean().optional(),
})

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const type = req.nextUrl.searchParams.get('type')
    const tag = req.nextUrl.searchParams.get('tag')
    const status = req.nextUrl.searchParams.get('status') ?? 'active'
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )

    const where = {
      ...(status === 'archived'
        ? { deletedAt: { not: null } }
        : status === 'all'
          ? {}
          : { deletedAt: null }),
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      ...(type ? { type: type as 'individual' | 'corporate' } : {}),
      ...(tag ? { tags: { has: tag.trim().toLowerCase() } } : {}),
      ...(buildClientSearchWhere(search) ?? {}),
    }

    const [items, total] = await Promise.all([
      req.db.client.findMany({
        where,
        select: {
          id: true, branchId: true, type: true, name: true, email: true,
          phone: true, city: true, state: true, createdAt: true, deletedAt: true,
          tags: true,
          branch: { select: { id: true, name: true } },
          _count: { select: { cases: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.client.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const body = CreateClientRequestSchema.parse(await req.json())
    const branchId = await resolveManagedClientBranchId(req.session, body.branchId ?? null)
    const contacts = normalizeClientContacts(body.contacts)
    const tags = normalizeClientTags(body.tags)

    const duplicateCandidates = await req.db.client.findMany({
      where: { deletedAt: null },
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
      { name: body.name, email: body.email, phone: body.phone, rcNumber: body.rcNumber },
      duplicateCandidates,
    )

    if (duplicateMatches.length > 0 && !body.allowDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_CLIENT',
            message: 'Possible duplicate clients found',
          },
          data: { duplicateMatches },
        },
        { status: 409 },
      )
    }

    const client = await req.db.client.create({
      data: {
        branchId,
        type: body.type,
        name: body.name,
        ...(body.email ? { email: body.email.trim().toLowerCase() } : {}),
        ...(body.phone ? { phone: body.phone.trim() } : {}),
        ...(body.address ? { address: body.address.trim() } : {}),
        ...(body.city ? { city: body.city.trim() } : {}),
        ...(body.state ? { state: body.state.trim() } : {}),
        ...(body.rcNumber ? { rcNumber: body.rcNumber.trim() } : {}),
        ...(normalizeClientText(body.notes) ? { notes: normalizeClientText(body.notes) } : {}),
        tags,
        createdById: req.session.userId,
        ...(contacts.length > 0
          ? {
              contacts: {
                create: contacts.map((contact) => ({
                  name: contact.name,
                  ...(contact.email ? { email: contact.email } : {}),
                  ...(contact.phone ? { phone: contact.phone } : {}),
                  ...(contact.role ? { role: contact.role } : {}),
                  isPrimary: Boolean(contact.isPrimary),
                })),
              },
            }
          : {}),
      },
      select: {
        id: true, branchId: true, type: true, name: true, email: true,
        phone: true, rcNumber: true, notes: true, tags: true, createdAt: true,
      },
    })
    return created({ ...client, duplicateMatches })
  } catch (err) {
    return errorResponse(err)
  }
}))
