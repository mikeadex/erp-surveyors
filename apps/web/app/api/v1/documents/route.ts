import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { created, errorResponse, ok } from '@/lib/api/response'
import { parsePagination } from '@/lib/api/pagination'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { createPresignedUploadUrl, hasSignedStorageConfig } from '@/lib/storage/s3'
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  buildDocumentStorageKey,
  buildDocumentVisibilityWhere,
  resolveDocumentLinks,
} from '@/lib/documents/document-workflow'
import { CreateDocumentSchema } from '@valuation-os/utils'
import { Errors } from '@/lib/api/errors'
import { assertRateLimit, buildRateLimitKey } from '@/lib/api/rate-limit'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const params = req.nextUrl.searchParams
    const caseId = params.get('caseId')
    const clientId = params.get('clientId')
    const propertyId = params.get('propertyId')
    const category = params.get('category')
    const search = params.get('search')
    const scopedBranchId = await resolveScopedBranchId(req.session).catch(() => undefined)

    const where = {
      firmId: req.session.firmId,
      deletedAt: null,
      confirmedAt: { not: null },
      ...(caseId ? { caseId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { category: { contains: search, mode: 'insensitive' as const } },
              { case: { reference: { contains: search, mode: 'insensitive' as const } } },
              { client: { name: { contains: search, mode: 'insensitive' as const } } },
              { property: { address: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(buildDocumentVisibilityWhere(scopedBranchId) ?? {}),
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true,
          name: true,
          s3Key: true,
          mimeType: true,
          sizeBytes: true,
          caseId: true,
          clientId: true,
          propertyId: true,
          category: true,
          tags: true,
          createdAt: true,
          uploadedById: true,
          confirmedAt: true,
          case: { select: { id: true, reference: true } },
          client: { select: { id: true, name: true } },
          property: { select: { id: true, address: true, city: true, state: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
})

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    await assertRateLimit(req, {
      namespace: 'documents-create',
      limit: 15,
      windowMs: 10 * 60 * 1000,
      key: buildRateLimitKey(req, [req.session.firmId, req.session.userId]),
    })

    if (!hasSignedStorageConfig()) {
      throw Errors.BAD_REQUEST('Document upload is not configured for this environment')
    }

    const body = CreateDocumentSchema.parse(await req.json())
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(body.mimeType)) {
      throw Errors.VALIDATION({
        mimeType: ['Upload PDF, Word, Excel, JPEG, or PNG documents only.'],
      })
    }
    if (body.sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
      throw Errors.VALIDATION({
        sizeBytes: ['Each document must be 50MB or smaller.'],
      })
    }

    const scopedBranchId = await resolveScopedBranchId(req.session).catch(() => undefined)
    const resolvedLinks = await resolveDocumentLinks({
      firmId: req.session.firmId,
      scopedBranchId,
      caseId: body.caseId,
      clientId: body.clientId,
      propertyId: body.propertyId,
    })

    const s3Key = buildDocumentStorageKey({
      firmId: req.session.firmId,
      fileName: body.name,
      mimeType: body.mimeType,
    })

    const document = await prisma.document.create({
      data: {
        firmId: req.session.firmId,
        caseId: resolvedLinks.caseRecord?.id ?? body.caseId ?? null,
        clientId: resolvedLinks.resolvedClientId,
        propertyId: resolvedLinks.resolvedPropertyId,
        name: body.name.trim(),
        category: body.category ?? null,
        tags: body.tags ?? [],
        s3Key,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        uploadedById: req.session.userId,
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

    const uploadUrl = await createPresignedUploadUrl({
      key: s3Key,
      contentType: body.mimeType,
    })

    return created({
      documentId: document.id,
      uploadUrl,
      document,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
