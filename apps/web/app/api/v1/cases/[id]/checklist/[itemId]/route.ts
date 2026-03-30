import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { z } from 'zod'

const ToggleSchema = z.object({
  isChecked: z.boolean(),
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, itemId } = await ctx.params as { id: string; itemId: string }
    const { isChecked } = ToggleSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const caseRecord = await prisma.case.findFirst({
      where: {
        id,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const item = await prisma.caseChecklistItem.findFirst({
      where: { id: itemId, caseId: id },
    })
    if (!item) throw Errors.NOT_FOUND('Checklist item')

    const [updated] = await prisma.$transaction([
      prisma.caseChecklistItem.update({
        where: { id: itemId },
        data: {
          isChecked,
          ...(isChecked
            ? { checkedById: req.session.userId, checkedAt: new Date() }
            : { checkedById: null, checkedAt: null }),
        },
      }),
      prisma.auditLog.create({
        data: {
          firmId: req.session.firmId,
          userId: req.session.userId,
          action: 'CASE_CHECKLIST_ITEM_UPDATED',
          entityType: 'Case',
          entityId: id,
          before: { label: item.label, isChecked: item.isChecked } as any,
          after: { label: item.label, isChecked } as any,
        },
      }),
    ])

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})

export const DELETE = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id, itemId } = await ctx.params as { id: string; itemId: string }
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const caseRecord = await prisma.case.findFirst({
      where: {
        id,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true },
    })
    if (!caseRecord) throw Errors.NOT_FOUND('Case')

    const item = await prisma.caseChecklistItem.findFirst({
      where: { id: itemId, caseId: id },
    })
    if (!item) throw Errors.NOT_FOUND('Checklist item')

    await prisma.$transaction([
      prisma.caseChecklistItem.delete({ where: { id: itemId } }),
      prisma.auditLog.create({
        data: {
          firmId: req.session.firmId,
          userId: req.session.userId,
          action: 'CASE_CHECKLIST_ITEM_DELETED',
          entityType: 'Case',
          entityId: id,
          before: { label: item.label, isChecked: item.isChecked } as any,
        },
      }),
    ])
    return ok({ message: 'Checklist item deleted' })
  } catch (err) {
    return errorResponse(err)
  }
})
