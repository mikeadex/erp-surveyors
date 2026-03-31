import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { UpdateCaseSchema } from '@valuation-os/utils'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { assertBranchBelongsToFirm, assertUserBelongsToFirm } from '@/lib/db/ownership'
import { prisma } from '@/lib/db/prisma'
import { createNotificationsForUsers } from '@/lib/notifications/workflow'

export const GET = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const caseRecord = await req.db.case.findUnique({
      where: { id, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      include: {
        client: { select: { id: true, name: true, type: true, email: true, phone: true } },
        property: true,
        assignedValuer: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedReviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        inspection: {
          select: {
            id: true, status: true, inspectionDate: true, submittedAt: true,
            inspector: { select: { id: true, firstName: true, lastName: true } },
            media: { select: { id: true, s3Key: true, caption: true }, take: 5 },
          },
        },
        documents: {
          where: {
            deletedAt: null,
            confirmedAt: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            s3Key: true,
            mimeType: true,
            category: true,
            tags: true,
            createdAt: true,
          },
        },
        invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
      },
    })

    if (!caseRecord) throw Errors.NOT_FOUND('Case')
    return ok(caseRecord)
  } catch (err) {
    return errorResponse(err)
  }
}))

export const PATCH = withAuth(withTenant(async (req: TenantRequest, ctx) => {
  try {
    const { id } = await ctx.params
    const body = UpdateCaseSchema.parse(await req.json())
    const currentBranchScope = await resolveScopedBranchId(req.session)

    const existing = await req.db.case.findUnique({
      where: { id, ...(currentBranchScope ? { branchId: currentBranchScope } : {}) },
      select: {
        id: true,
        stage: true,
        dueDate: true,
        assignedValuerId: true,
        assignedReviewerId: true,
        branchId: true,
      },
    })
    if (!existing) throw Errors.NOT_FOUND('Case')

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    const nextBranchId =
      body.branchId !== undefined
        ? await resolveScopedBranchId(req.session, body.branchId)
        : existing.branchId ?? currentBranchScope

    if (body.branchId !== undefined && nextBranchId) {
      await assertBranchBelongsToFirm(nextBranchId, req.firmId)
    }

    await Promise.all([
      ...(body.assignedValuerId
        ? [
            assertUserBelongsToFirm(
              body.assignedValuerId,
              req.firmId,
              'valuer',
              ['managing_partner', 'reviewer', 'valuer', 'field_officer'],
            ),
          ]
        : []),
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
    ])

    await req.db.case.updateMany({
      where: { id, ...(currentBranchScope ? { branchId: currentBranchScope } : {}) },
      data: {
        ...(data as Record<string, unknown>),
        ...(body.branchId !== undefined ? { branchId: nextBranchId ?? null } : {}),
      },
    })
    const updated = await req.db.case.findUnique({
      where: { id, ...(nextBranchId ? { branchId: nextBranchId } : {}) },
      select: {
        id: true, reference: true, stage: true, isOverdue: true,
        branchId: true, dueDate: true, updatedAt: true,
      },
    })
    if (!updated) throw Errors.NOT_FOUND('Case')

    await prisma.auditLog.create({
      data: {
        firmId: req.firmId,
        userId: req.session.userId,
        action: 'CASE_UPDATED',
        entityType: 'Case',
        entityId: id,
        before: {
          stage: existing.stage,
          dueDate: existing.dueDate?.toISOString() ?? null,
          assignedValuerId: existing.assignedValuerId,
          assignedReviewerId: existing.assignedReviewerId,
          branchId: existing.branchId,
        } as any,
        after: {
          stage: updated.stage,
          dueDate: updated.dueDate?.toISOString() ?? null,
          branchId: updated.branchId,
        } as any,
      },
    })

    const assignmentTargets = [
      body.assignedValuerId && body.assignedValuerId !== existing.assignedValuerId ? body.assignedValuerId : null,
      body.assignedReviewerId && body.assignedReviewerId !== existing.assignedReviewerId ? body.assignedReviewerId : null,
    ].filter(Boolean) as string[]

    if (assignmentTargets.length > 0) {
      await createNotificationsForUsers({
        firmId: req.firmId,
        userIds: assignmentTargets,
        type: 'case_assigned',
        title: `Case assignment updated: ${updated.reference}`,
        body: 'A case has been assigned or reassigned to you.',
        entityType: 'Case',
        entityId: id,
      })
    }

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
}))
