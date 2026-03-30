'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface SavedView {
  key: string
  label: string
  description: string
  count: number
  href: string
  active: boolean
}

interface ClientSavedViewsProps {
  views: SavedView[]
}

export function ClientSavedViews({ views }: ClientSavedViewsProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  if (views.length === 0) return null

  return (
    <section className="surface-card rounded-[28px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Saved Views</h2>
          <p className="mt-1 text-xs text-slate-500">
            Jump to common CRM slices without rebuilding filters each time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200 hover:text-brand-700 md:hidden"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? 'Hide' : 'Show'}
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className={`${mobileOpen ? 'mt-4 grid gap-3' : 'hidden'} md:mt-4 md:grid md:gap-3 md:grid-cols-2 xl:grid-cols-5`}>
        {views.map((view) => (
          <Link
            key={view.key}
            href={view.href}
            className={`rounded-[24px] border px-4 py-3 transition-colors ${
              view.active
                ? 'border-brand-200 bg-brand-50/80'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${view.active ? 'text-brand-900' : 'text-slate-900'}`}>
                  {view.label}
                </p>
                <p className={`mt-1 text-xs leading-5 ${view.active ? 'text-brand-700' : 'text-slate-500'}`}>
                  {view.description}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  view.active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {view.count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
