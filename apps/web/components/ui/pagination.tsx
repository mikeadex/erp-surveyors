'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
}

export function Pagination({ page, totalPages, total, pageSize }: PaginationProps) {
  const searchParams = useSearchParams()

  function pageHref(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={pageHref(page - 1)}
          aria-disabled={page <= 1}
          className={`rounded-lg px-2 py-1.5 hover:bg-gray-100 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="px-2">
          {page} / {totalPages}
        </span>
        <Link
          href={pageHref(page + 1)}
          aria-disabled={page >= totalPages}
          className={`rounded-lg px-2 py-1.5 hover:bg-gray-100 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
