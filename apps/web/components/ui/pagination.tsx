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
    <div className="surface-card flex items-center justify-between rounded-[24px] px-4 py-3 text-sm text-slate-600">
      <span className="font-medium">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={pageHref(page - 1)}
          aria-disabled={page <= 1}
          className={`rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-100 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="px-2 text-slate-500">
          {page} / {totalPages}
        </span>
        <Link
          href={pageHref(page + 1)}
          aria-disabled={page >= totalPages}
          className={`rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-100 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
