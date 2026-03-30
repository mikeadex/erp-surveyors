import { withAuth } from '@/lib/api/with-auth'
import { withTenant, type TenantRequest } from '@/lib/api/with-tenant'
import { ok, created, errorResponse } from '@/lib/api/response'
import { parsePagination, parseSearch } from '@/lib/api/pagination'
import { CreatePropertySchema } from '@valuation-os/utils'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildPropertySearchWhere,
  findPropertyDuplicateMatches,
  normalizePropertyPayload,
} from '@/lib/properties/property-records'

const CreatePropertyRequestSchema = CreatePropertySchema.extend({
  allowDuplicate: z.boolean().optional(),
})

export const GET = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req)
    const search = parseSearch(req)
    const params = req.nextUrl.searchParams
    const state = params.get('state')
    const propertyUse = params.get('propertyUse')
    const status = params.get('status') ?? 'active'

    const where = {
      ...(status === 'archived'
        ? { deletedAt: { not: null } }
        : status === 'all'
          ? {}
          : { deletedAt: null }),
      ...(state ? { state } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(propertyUse ? { propertyUse: propertyUse as any } : {}),
      ...(buildPropertySearchWhere(search) ?? {}),
    }

    const [items, total] = await Promise.all([
      req.db.property.findMany({
        where,
        select: {
          id: true, address: true, city: true, state: true,
          localGovernment: true, propertyUse: true, tenureType: true,
          plotSize: true, plotSizeUnit: true, description: true, createdAt: true, deletedAt: true,
          _count: { select: { cases: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      req.db.property.count({ where }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    return errorResponse(err)
  }
}))

export const POST = withAuth(withTenant(async (req: TenantRequest) => {
  try {
    const body = CreatePropertyRequestSchema.parse(await req.json())
    const normalized = normalizePropertyPayload(body)

    const duplicateCandidates = await req.db.property.findMany({
      where: { deletedAt: null },
      select: { id: true, address: true, city: true, state: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const duplicateMatches = findPropertyDuplicateMatches(
      { address: normalized.address!, city: normalized.city!, state: normalized.state! },
      duplicateCandidates,
    )

    if (duplicateMatches.length > 0 && !body.allowDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_PROPERTY',
            message: 'Possible duplicate properties found',
          },
          data: { duplicateMatches },
        },
        { status: 409 },
      )
    }

    const property = await req.db.property.create({
      data: {
        address: normalized.address!,
        city: normalized.city!,
        state: normalized.state!,
        ...(normalized.localGovernment ? { localGovernment: normalized.localGovernment } : {}),
        propertyUse: normalized.propertyUse!,
        tenureType: normalized.tenureType!,
        ...(typeof normalized.plotSize === 'number' ? { plotSize: normalized.plotSize } : {}),
        ...(normalized.plotSizeUnit ? { plotSizeUnit: normalized.plotSizeUnit } : {}),
        ...(normalized.description ? { description: normalized.description } : {}),
        ...(typeof normalized.latitude === 'number' ? { latitude: normalized.latitude } : {}),
        ...(typeof normalized.longitude === 'number' ? { longitude: normalized.longitude } : {}),
        createdById: req.session.userId,
      },
      select: {
        id: true, address: true, city: true, state: true,
        propertyUse: true, tenureType: true, plotSize: true, plotSizeUnit: true, createdAt: true,
      },
    })
    return created(property)
  } catch (err) {
    return errorResponse(err)
  }
}))
