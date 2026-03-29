'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderOpen, ClipboardList, BarChart3,
  FileText, Users, Building2, Receipt, Paperclip, Shield,
  Settings, LogOut, type LucideIcon,
} from 'lucide-react'
import { NAV_ITEMS, type NavItem } from './nav-config'
import type { UserRole } from '@valuation-os/types'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, FolderOpen, ClipboardList, BarChart3,
  FileText, Users, Building2, Receipt, Paperclip, Shield, Settings,
}

interface SidebarProps {
  userRole: UserRole
  firmName: string
}

function canAccess(item: NavItem, role: UserRole): boolean {
  return !item.allowedRoles || item.allowedRoles.includes(role)
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = ICON_MAP[item.icon]
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-brand-50 text-brand-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      ].join(' ')}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {item.label}
    </Link>
  )
}

export function Sidebar({ userRole, firmName }: SidebarProps) {
  const pathname = usePathname()
  const visible = NAV_ITEMS.filter((item) => canAccess(item, userRole))

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <span className="text-sm font-semibold text-gray-900 truncate">{firmName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visible.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <form action="/api/v1/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
