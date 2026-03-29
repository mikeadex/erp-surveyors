'use client'

import Link from 'next/link'
import { initials } from '@valuation-os/utils'
import { NotificationsBell } from './notifications-bell'
import type { User } from '@valuation-os/types'

interface HeaderProps {
  user: Pick<User, 'firstName' | 'lastName' | 'role'>
  title?: string
}

export function Header({ user, title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {title ? (
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        <NotificationsBell />

        <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shrink-0"
          >
            {initials(user.firstName, user.lastName)}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {user.firstName} {user.lastName}
          </span>
        </Link>
      </div>
    </header>
  )
}
