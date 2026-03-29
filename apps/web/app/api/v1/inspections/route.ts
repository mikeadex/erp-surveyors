import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { parsePagination } from '@/lib/api/pagination'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const scopedBranchId = await resolveScopedBranchId(
      req.session,
      req.nextUrl.searchParams.get('branchId'),
    )
    const status = req.nextUrl.searchParams.get('status')

    const where = {
      case: {
        firmId: req.session.firmId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(status ? { status: status as any } : {}),
      ...(['valuer', 'field_officer'].includes(req.session.role)
        ? { inspectedById: req.session.userId }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        select: {
          id: true,
          caseId: true,
          status: true,
          inspectionDate: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
          case: { select: { id: true, reference: true, stage: true } },
          inspector: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inspection.count({ where }),
    ])

    return ok({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    return errorResponse(err)
  }
})
