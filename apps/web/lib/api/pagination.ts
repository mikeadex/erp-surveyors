import { NextRequest } from 'next/server'
import { PAGINATION_DEFAULT_PAGE_SIZE, PAGINATION_MAX_PAGE_SIZE } from '@valuation-os/utils'

export interface ParsedPagination {
  page: number
  pageSize: number
  skip: number
  take: number
}

export function parsePagination(req: NextRequest): ParsedPagination {
  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10))
  const pageSize = Math.min(
    PAGINATION_MAX_PAGE_SIZE,
    Math.max(1, parseInt(params.get('pageSize') ?? String(PAGINATION_DEFAULT_PAGE_SIZE), 10)),
  )
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

export function parseSearch(req: NextRequest): string | undefined {
  return req.nextUrl.searchParams.get('q') ?? undefined
}
