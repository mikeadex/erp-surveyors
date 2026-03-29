import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { parsePagination } from '@/lib/api/pagination'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const params = req.nextUrl.searchParams
    const caseId = params.get('caseId')
    const search = params.get('search')

    const where = {
      firmId: req.session.firmId,
      deletedAt: null,
      ...(caseId ? { caseId } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true, name: true, s3Key: true, mimeType: true,
          sizeBytes: true, caseId: true, createdAt: true, uploadedById: true,
          case: { select: { id: true, reference: true } },
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
