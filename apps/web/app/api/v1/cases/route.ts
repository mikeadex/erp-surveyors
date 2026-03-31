import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { prisma } from '@/lib/db/prisma'
import { ok, created, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { CreateCaseSchema } from '@valuation-os/utils'
import type { CaseStage } from '@valuation-os/types'
import { Prisma } from '@prisma/client'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import {
  assertBranchBelongsToFirm,
  assertClientBelongsToFirm,
  assertPropertyBelongsToFirm,
  assertUserBelongsToFirm,
} from '@/lib/db/ownership'
import { createNotificationsForUsers } from '@/lib/notifications/workflow'

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
          inspection: {
            select: {
              id: true,
              status: true,
              inspectionDate: true,
              submittedAt: true,
            },
          },
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

async function generateReference(): Promise<string> {
  const now = new Date()
  const prefix = `VAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const latest = await prisma.case.findFirst({
    where: {
      reference: {
        startsWith: `${prefix}-`,
      },
    },
    select: { reference: true },
    orderBy: { reference: 'desc' },
  })

  const lastSequence = latest?.reference.match(/-(\d{4})$/)?.[1]
  const nextSequence = (lastSequence ? Number(lastSequence) : 0) + 1

  return `${prefix}-${String(nextSequence).padStart(4, '0')}`
}

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const body = CreateCaseSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session, body.branchId ?? null)

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

    const selectedProperty = await req.db.property.findFirst({
      where: {
        id: body.propertyId,
        firmId: req.firmId,
        deletedAt: null,
      },
      select: { id: true, clientId: true },
    })
    if (!selectedProperty) throw Errors.BAD_REQUEST('Selected property does not belong to your firm')
    if (selectedProperty.clientId && selectedProperty.clientId !== body.clientId) {
      throw Errors.BAD_REQUEST('Selected property does not belong to the chosen client')
    }

    let caseRecord: {
      id: string
      reference: string
      stage: CaseStage
      valuationType: string
      createdAt: Date
      client: { id: string; name: string }
    } | null = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = await generateReference()

      try {
        caseRecord = await req.db.case.create({
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
        break
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError
          && err.code === 'P2002'
          && Array.isArray(err.meta?.target)
          && err.meta.target.includes('reference')
        ) {
          continue
        }
        throw err
      }
    }

    if (!caseRecord) {
      throw Errors.CONFLICT('Could not generate a unique case reference. Please try again.')
    }

    await prisma.auditLog.create({
      data: {
        firmId: req.firmId,
        userId: req.session.userId,
        action: 'CASE_CREATED',
        entityType: 'Case',
        entityId: caseRecord.id,
        after: {
          reference: caseRecord.reference,
          stage: caseRecord.stage,
          valuationType: caseRecord.valuationType,
        } as any,
      },
    })

    await createNotificationsForUsers({
      firmId: req.firmId,
      userIds: [body.assignedValuerId, body.assignedReviewerId],
      type: 'case_assigned',
      title: `New case assigned: ${caseRecord.reference}`,
      body: `${caseRecord.client.name} is now assigned to your workflow.`,
      entityType: 'Case',
      entityId: caseRecord.id,
    })

    return created(caseRecord)
  } catch (err) {
    return errorResponse(err)
  }
}))
