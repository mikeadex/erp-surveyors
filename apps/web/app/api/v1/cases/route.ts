import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, created, errorResponse } from '@/lib/api/response'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { CreateCaseSchema } from '@valuation-os/utils'
import type { CaseStage } from '@valuation-os/types'
import type { TenantPrisma } from '@/lib/db/tenant'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import {
  assertBranchBelongsToFirm,
  assertClientBelongsToFirm,
  assertPropertyBelongsToFirm,
  assertUserBelongsToFirm,
} from '@/lib/db/ownership'

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const params = req.nextUrl.searchParams
    const scopedBranchId = await resolveScopedBranchId(req.session, params.get('branchId'))
    const stage = params.get('stage') as CaseStage | null
    const isOverdue = params.get('isOverdue') === 'true' ? true : undefined
    const assignedToMe = params.get('assignedToMe') === 'true'

    const where = {
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      ...(stage ? { stage } : {}),
      ...(isOverdue !== undefined ? { isOverdue } : {}),
      ...(assignedToMe
        ? {
            OR: [
              { assignedValuerId: req.session.userId },
              { assignedReviewerId: req.session.userId },
            ],
          }
        : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' as const } },
              { client: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      req.db.case.findMany({
        where,
        select: {
          id: true, reference: true, stage: true, valuationType: true,
          isOverdue: true, dueDate: true, createdAt: true, updatedAt: true,
          client: { select: { id: true, name: true, type: true } },
          property: { select: { id: true, address: true, localGovernment: true, state: true } },
          assignedValuer: { select: { id: true, firstName: true, lastName: true } },
          assignedReviewer: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take,
        orderBy: [{ isOverdue: 'desc' }, { createdAt: 'desc' }],
      }),
      req.db.case.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

async function generateReference(db: TenantPrisma): Promise<string> {
  const now = new Date()
  const prefix = `VAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const count = await db.case.count()
  return `${prefix}-${String(count + 1).padStart(4, '0')}`
}

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const body = CreateCaseSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session, body.branchId ?? null)
    const reference = await generateReference(req.db)

    await Promise.all([
      assertClientBelongsToFirm(body.clientId, req.firmId),
      assertPropertyBelongsToFirm(body.propertyId, req.firmId),
      assertUserBelongsToFirm(
        body.assignedValuerId,
        req.firmId,
        'valuer',
        ['managing_partner', 'reviewer', 'valuer', 'field_officer'],
      ),
      ...(body.assignedReviewerId
        ? [
            assertUserBelongsToFirm(
              body.assignedReviewerId,
              req.firmId,
              'reviewer',
              ['managing_partner', 'reviewer'],
            ),
          ]
        : []),
      ...(scopedBranchId ? [assertBranchBelongsToFirm(scopedBranchId, req.firmId)] : []),
    ])

    const caseRecord = await req.db.case.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...(body as any),
        branchId: scopedBranchId ?? null,
        reference,
        createdById: req.session.userId,
      },
      select: {
        id: true, reference: true, stage: true, valuationType: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
      },
    })

    return created(caseRecord)
  } catch (err) {
    return errorResponse(err)
  }
}))
