import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { buildDocumentVisibilityWhere } from '@/lib/documents/document-workflow'
import { ConfirmDocumentUploadSchema } from '@valuation-os/utils'

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    const body = ConfirmDocumentUploadSchema.parse(await req.json())
    const scopedBranchId = await resolveScopedBranchId(req.session).catch(() => undefined)

    const document = await prisma.document.findFirst({
      where: {
        id: body.documentId,
        firmId: req.session.firmId,
        deletedAt: null,
        ...(buildDocumentVisibilityWhere(scopedBranchId) ?? {}),
      },
      select: {
        id: true,
        name: true,
        caseId: true,
        clientId: true,
        propertyId: true,
        confirmedAt: true,
      },
    })
    if (!document) throw Errors.NOT_FOUND('Document')

    if (document.confirmedAt) {
      return ok({ id: document.id, confirmedAt: document.confirmedAt })
    }

    const confirmed = await prisma.document.update({
      where: { id: document.id },
      data: { confirmedAt: new Date() },
      select: {
        id: true,
        name: true,
        category: true,
        tags: true,
        caseId: true,
        clientId: true,
        propertyId: true,
        confirmedAt: true,
        createdAt: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        firmId: req.session.firmId,
        userId: req.session.userId,
        action: 'DOCUMENT_CONFIRMED',
        entityType: 'Document',
        entityId: document.id,
        after: {
          confirmedAt: confirmed.confirmedAt,
          caseId: confirmed.caseId,
          clientId: confirmed.clientId,
          propertyId: confirmed.propertyId,
        } as any,
      },
    })

    return ok(confirmed)
  } catch (err) {
    return errorResponse(err)
  }
})
