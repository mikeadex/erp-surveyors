'use client'

import Link from 'next/link'
import { Menu, Search, X } from 'lucide-react'
import { initials } from '@valuation-os/utils'
import { NotificationsBell } from './notifications-bell'
import { useDashboardShell } from './dashboard-shell-context'
import type { User } from '@valuation-os/types'

interface HeaderProps {
  user: Pick<User, 'firstName' | 'lastName' | 'role'>
  title?: string
}

export function Header({ user, title }: HeaderProps) {
  const { mobileOpen, isDesktop, toggleSidebar } = useDashboardShell()
  const todayLabel = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <header className="sticky top-0 z-30 px-3 pb-3 pt-3 sm:px-4 sm:pt-4 lg:px-6">
      <div className="surface-panel flex min-h-[72px] items-start justify-between gap-3 rounded-[24px] px-3.5 py-3.5 sm:min-h-[84px] sm:rounded-[28px] sm:px-5 sm:py-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="min-w-0">
            <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:flex">
              <span>Operations Workspace</span>
            </div>
            {title ? (
              <div className="mt-0.5 sm:mt-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {title}
                </h1>
                <p className="mt-1 hidden text-sm text-slate-500 sm:block">Live view for {todayLabel}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.2)] transition-colors hover:border-brand-200 hover:text-brand-700 sm:h-11 sm:w-11 lg:hidden"
            aria-label={
              mobileOpen ? 'Close menu' : 'Open menu'
            }
            title={
              mobileOpen ? 'Close menu' : 'Open menu'
            }
          >
            {mobileOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </button>

          <button
            type="button"
            className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.2)] transition-colors hover:border-brand-200 hover:text-slate-700 xl:flex"
          >
            <Search className="h-4 w-4 text-slate-400" />
            <span>Search records</span>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
              Ctrl K
            </span>
          </button>

          <div className="hidden sm:block">
            <NotificationsBell />
          </div>

          <Link
            href="/profile"
            className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.2)] transition-colors hover:border-brand-200 hover:bg-white sm:flex sm:gap-3 sm:px-2.5 sm:py-2"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-600 text-xs font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.75)] shrink-0 sm:h-10 sm:w-10"
            >
              {initials(user.firstName, user.lastName)}
            </span>
            <span className="hidden min-w-0 lg:block">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-xs capitalize text-slate-500">
                {user.role.replaceAll('_', ' ')}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
