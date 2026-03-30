import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { z } from 'zod'

const AddNoteSchema = z.object({
  note: z.string().min(1).max(5000),
})

export const POST = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const { note } = AddNoteSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session)

    const existing = await prisma.case.findFirst({
      where: {
        id,
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true, internalNotes: true },
    })
    if (!existing) throw Errors.NOT_FOUND('Case')

    const timestamp = new Date().toISOString()
    const entry = `[${timestamp}] ${note}`
    const updatedNotes = existing.internalNotes
      ? `${existing.internalNotes}\n${entry}`
      : entry

    const [updated] = await prisma.$transaction([
      prisma.case.update({
        where: { id },
        data: { internalNotes: updatedNotes },
        select: { id: true, internalNotes: true, updatedAt: true },
      }),
      prisma.auditLog.create({
        data: {
          firmId: req.session.firmId,
          userId: req.session.userId,
          action: 'CASE_NOTE_ADDED',
          entityType: 'Case',
          entityId: id,
          after: { note, timestamp } as any,
        },
      }),
    ])

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
