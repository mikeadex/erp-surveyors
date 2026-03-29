import { NextResponse } from 'next/server'
import type { ApiSuccess, ApiError, PaginatedData } from '@valuation-os/types'
import { AppError } from './errors'
import { ZodError } from 'zod'

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return ok(data, 201)
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): NextResponse<ApiSuccess<PaginatedData<T>>> {
  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export function errorResponse(err: unknown): NextResponse<ApiError> {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.statusCode },
    )
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root'
      details[key] = [...(details[key] ?? []), issue.message]
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
      },
      { status: 422 },
    )
  }

  console.error('[API Error]', err)
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 },
  )
}
