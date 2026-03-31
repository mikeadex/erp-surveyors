import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { errorResponse, ok } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { buildDocumentVisibilityWhere, resolveDocumentLinks } from '@/lib/documents/document-workflow'
import { UpdateDocumentSchema } from '@valuation-os/utils'

async function findVisibleDocument(id: string, req: AuthedRequest) {
  const scopedBranchId = await resolveScopedBranchId(req.session).catch(() => undefined)

  const document = await prisma.document.findFirst({
    where: {
      id,
      firmId: req.session.firmId,
      deletedAt: null,
      ...(buildDocumentVisibilityWhere(scopedBranchId) ?? {}),
    },
    select: {
      id: true,
      name: true,
      category: true,
      tags: true,
      s3Key: true,
      mimeType: true,
      sizeBytes: true,
      caseId: true,
      clientId: true,
      propertyId: true,
      uploadedById: true,
      confirmedAt: true,
      createdAt: true,
      case: { select: { id: true, reference: true, branchId: true, clientId: true, propertyId: true } },
      client: { select: { id: true, name: true, branchId: true } },
      property: { select: { id: true, address: true, city: true, state: true } },
    },
  })

  if (!document) throw Errors.NOT_FOUND('Document')

  return { document, scopedBranchId }
}

export const GET = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const { document } = await findVisibleDocument(id, req)
    return ok(document)
  } catch (err) {
    return errorResponse(err)
  }
})

export const PATCH = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const body = UpdateDocumentSchema.parse(await req.json())
    const { document, scopedBranchId } = await findVisibleDocument(id, req)

    const links = await resolveDocumentLinks({
      firmId: req.session.firmId,
      scopedBranchId,
      caseId: body.caseId ?? document.caseId,
      clientId: body.clientId ?? document.clientId,
      propertyId: body.propertyId ?? document.propertyId,
    })

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.category !== undefined ? { category: body.category ?? null } : {}),
        ...(body.tags !== undefined ? { tags: body.tags ?? [] } : {}),
        caseId: links.caseRecord?.id ?? body.caseId ?? document.caseId ?? null,
        clientId: links.resolvedClientId,
        propertyId: links.resolvedPropertyId,
      },
      select: {
        id: true,
        name: true,
        category: true,
        tags: true,
        s3Key: true,
        mimeType: true,
        sizeBytes: true,
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
        action: 'DOCUMENT_UPDATED',
        entityType: 'Document',
        entityId: document.id,
        before: {
          name: document.name,
          category: document.category,
          tags: document.tags,
          caseId: document.caseId,
          clientId: document.clientId,
          propertyId: document.propertyId,
        } as any,
        after: {
          name: updated.name,
          category: updated.category,
          tags: updated.tags,
          caseId: updated.caseId,
          clientId: updated.clientId,
          propertyId: updated.propertyId,
        } as any,
      },
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})

export const DELETE = withAuth(async (req: AuthedRequest, ctx) => {
  try {
    const { id } = await ctx.params as { id: string }
    const { document } = await findVisibleDocument(id, req)

    const deleted = await prisma.document.update({
      where: { id: document.id },
      data: { deletedAt: new Date() },
      select: { id: true, name: true, deletedAt: true },
    })

    await prisma.auditLog.create({
      data: {
        firmId: req.session.firmId,
        userId: req.session.userId,
        action: 'DOCUMENT_DELETED',
        entityType: 'Document',
        entityId: document.id,
        before: {
          name: document.name,
          caseId: document.caseId,
          clientId: document.clientId,
          propertyId: document.propertyId,
        } as any,
      },
    })

    return ok(deleted)
  } catch (err) {
    return errorResponse(err)
  }
})
