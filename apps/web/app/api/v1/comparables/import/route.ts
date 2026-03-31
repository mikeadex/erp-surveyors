import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { created, errorResponse } from '@/lib/api/response'
import { normalizeComparablePayload } from '@/lib/comparables/comparable-records'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/auth/guards'
import { parsePagination } from '@/lib/api/pagination'
import { ok } from '@/lib/api/response'
import {
  buildComparableImportTemplate,
  parseComparableImportRow,
  parseCsvText,
  type ComparableImportError,
} from '@/lib/comparables/comparable-import'
import { assertRateLimit, buildRateLimitKey } from '@/lib/api/rate-limit'

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const status = req.nextUrl.searchParams.get('status')

    const where = {
      firmId: req.session.firmId,
      ...(status ? { status: status as 'pending' | 'processing' | 'complete' | 'partial_failure' | 'failed' } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.comparableImportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.comparableImportJob.count({ where }),
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
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner', 'admin'])
    assertRateLimit(req, {
      namespace: 'comparables-import',
      limit: 5,
      windowMs: 60 * 60 * 1000,
      key: buildRateLimitKey(req, [req.session.firmId, req.session.userId]),
    })

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new Error('Upload a CSV file to import comparables')
    }

    const text = await file.text()
    const rows = parseCsvText(text)

    const job = await prisma.comparableImportJob.create({
      data: {
        firmId: req.session.firmId,
        fileKey: file.name || `comparables-import-${Date.now()}.csv`,
        status: 'processing',
        createdById: req.session.userId,
      },
    })

    if (rows.length === 0) {
      const updated = await prisma.comparableImportJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          failedCount: 1,
          errors: [{ row: 0, error: 'The CSV is empty or only contains headers' }],
        },
      })

      return created({
        job: updated,
        template: buildComparableImportTemplate(),
      })
    }

    let importedCount = 0
    const errors: ComparableImportError[] = []

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2

      try {
        const parsed = parseComparableImportRow(row, rowNumber)
        const normalized = normalizeComparablePayload(parsed.input)

        await req.db.comparable.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: {
            ...(normalized as any),
            addedById: req.session.userId,
            ...(typeof parsed.isVerified === 'boolean' ? { isVerified: parsed.isVerified } : {}),
          },
        })

        importedCount += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Row import failed'
        errors.push({
          row: rowNumber,
          error: message.replace(`Row ${rowNumber}: `, ''),
        })
      }
    }

    const status =
      importedCount > 0 && errors.length > 0
        ? 'partial_failure'
        : importedCount > 0
          ? 'complete'
          : 'failed'

    const updated = await prisma.comparableImportJob.update({
      where: { id: job.id },
      data: {
        status,
        importedCount,
        failedCount: errors.length,
        errors,
      },
    })

    return created({
      job: updated,
      template: buildComparableImportTemplate(),
    })
  } catch (err) {
    return errorResponse(err)
  }
}))
