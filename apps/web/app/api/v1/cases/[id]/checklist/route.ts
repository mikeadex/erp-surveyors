import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { z } from 'zod'

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
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

    const items = await prisma.caseChecklistItem.findMany({
      where: { caseId: id },
      orderBy: { label: 'asc' },
    })

    return ok(items)
  } catch (err) {
    return errorResponse(err)
  }
})

const CreateChecklistItemSchema = z.object({
  label: z.string().min(1).max(300),
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const { label } = CreateChecklistItemSchema.parse(await req.json())
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

    const [item] = await prisma.$transaction([
      prisma.caseChecklistItem.create({
        data: { caseId: id, label },
      }),
      prisma.auditLog.create({
        data: {
          firmId: req.session.firmId,
          userId: req.session.userId,
          action: 'CASE_CHECKLIST_ITEM_ADDED',
          entityType: 'Case',
          entityId: id,
          after: { label } as any,
        },
      }),
    ])

    return ok(item, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
