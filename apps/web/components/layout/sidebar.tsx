'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { initials } from '@valuation-os/utils'
import {
  LayoutDashboard, FolderOpen, ClipboardList, BarChart3,
  FileText, Users, Building2, Receipt, Paperclip, Shield,
  Settings, LogOut, ChevronRight, PanelLeft, PanelLeftClose, X, type LucideIcon,
} from 'lucide-react'
import { NAV_ITEMS, type NavItem } from './nav-config'
import { useDashboardShell } from './dashboard-shell-context'
import type { UserRole } from '@valuation-os/types'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, FolderOpen, ClipboardList, BarChart3,
  FileText, Users, Building2, Receipt, Paperclip, Shield, Settings,
}

interface SidebarProps {
  userRole: UserRole
  firmName: string
  userFirstName: string
  userLastName: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

function canAccess(item: NavItem, role: UserRole): boolean {
  return !item.allowedRoles || item.allowedRoles.includes(role)
}

function buildSections(items: NavItem[]): NavSection[] {
  const sections: NavSection[] = [
    { label: 'Overview', items: [] },
    { label: 'Workflow', items: [] },
    { label: 'Registry', items: [] },
    { label: 'Control', items: [] },
  ]

  for (const item of items) {
    if (item.label === 'Dashboard') {
      sections[0].items.push(item)
      continue
    }

    if (['Cases', 'Inspections', 'Comparables', 'Reports', 'Documents'].includes(item.label)) {
      sections[1].items.push(item)
      continue
    }

    if (['Clients', 'Properties', 'Invoices'].includes(item.label)) {
      sections[2].items.push(item)
      continue
    }

    sections[3].items.push(item)
  }

  return sections.filter((section) => section.items.length > 0)
}

function NavLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = ICON_MAP[item.icon]
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={[
        'group flex items-center rounded-2xl text-sm font-medium transition-all',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-3',
        isActive
          ? 'bg-brand-600 text-white shadow-[0_14px_30px_-20px_rgba(11,106,56,0.7)]'
          : 'text-slate-600 hover:bg-white hover:text-slate-900',
      ].join(' ')}
    >
      <span
        className={[
          'flex shrink-0 items-center justify-center rounded-xl border transition-colors',
          collapsed ? 'h-8 w-8' : 'h-9 w-9',
          isActive
            ? 'border-white/18 bg-white/10 text-white'
            : 'border-slate-200/80 bg-white text-slate-500 group-hover:text-brand-700',
        ].join(' ')}
      >
        {Icon && <Icon className={`${collapsed ? 'h-[15px] w-[15px]' : 'h-4 w-4'} shrink-0`} />}
      </span>
      {!collapsed ? <span className="flex-1">{item.label}</span> : null}
      {!collapsed ? (
        <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'translate-x-0 text-white/80' : '-translate-x-1 text-slate-300 group-hover:translate-x-0 group-hover:text-slate-500'}`} />
      ) : null}
    </Link>
  )
}

function SidebarInner({
  compact,
  mobile,
  pathname,
  sections,
  firmName,
  userRole,
  userFirstName,
  userLastName,
  onNavigate,
  onClose,
  onToggle,
}: {
  compact: boolean
  mobile?: boolean
  pathname: string
  sections: NavSection[]
  firmName: string
  userRole: UserRole
  userFirstName: string
  userLastName: string
  onNavigate?: () => void
  onClose?: () => void
  onToggle?: () => void
}) {
  const userInitials = initials(userFirstName, userLastName)

  return (
    <div
      className={[
        'surface-panel flex h-full flex-col',
        mobile ? 'rounded-none px-4 py-4' : 'rounded-[28px]',
        !mobile && compact ? 'px-2 py-3' : '',
        !mobile && !compact ? 'px-3 py-4' : '',
      ].join(' ')}
    >
      {mobile ? (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Valuation OS
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{firmName}</h2>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.18)] transition-colors hover:border-brand-200 hover:text-brand-700"
              aria-label="Close menu"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
      ) : null}

      {!mobile ? (
        <div className={['border border-slate-200/70 bg-white shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)]', compact ? 'rounded-[20px] px-2.5 py-3' : 'rounded-[22px] px-4 py-4'].join(' ')}>
          <>
            <div className={['flex items-center', compact ? 'justify-center' : 'justify-between gap-3'].join(' ')}>
              <div className={['flex items-center', compact ? 'flex-col gap-2' : 'gap-3'].join(' ')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-sm font-semibold text-white">
                  VO
                </div>
                {!compact ? (
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Valuation OS
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">{firmName}</p>
                  </div>
                ) : null}
                {compact ? (
                  <button
                    type="button"
                    onClick={onToggle}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-brand-200 hover:text-brand-700"
                    aria-label="Expand sidebar"
                    title="Expand sidebar"
                  >
                    <PanelLeft className="h-[16px] w-[16px]" />
                  </button>
                ) : null}
              </div>
              {!compact ? (
                <button
                  type="button"
                  onClick={onToggle}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-brand-200 hover:text-brand-700"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                </button>
              ) : null}
            </div>

            {!compact ? (
              <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-slate-900">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Workspace
                </p>
                <p className="mt-1 text-sm font-semibold capitalize">
                  {userRole.replaceAll('_', ' ')}
                </p>
              </div>
            ) : null}
          </>
        </div>
      ) : null}

      <div className={['mt-4 flex-1 overflow-y-auto', compact ? 'pr-0' : 'pr-1'].join(' ')}>
        <div className={compact ? 'space-y-3' : 'space-y-5'}>
          {sections.map((section) => (
            <section key={section.label}>
              {!compact ? (
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {section.label}
                </div>
              ) : null}
              <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={compact}
                    {...(onNavigate ? { onNavigate } : {})}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className={['mt-4 rounded-[22px] border border-slate-200/70 bg-white shadow-[0_12px_28px_-24px_rgba(15,23,42,0.2)]', compact ? 'p-2' : 'p-3'].join(' ')}>
        {mobile ? (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-xs font-semibold text-white">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {userFirstName} {userLastName}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {userRole.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
        ) : null}
        {!compact ? (
          <p className="text-xs font-medium leading-5 text-slate-500">
            Keep your pipeline moving and your branch activity visible from one place.
          </p>
        ) : null}
        <form action="/api/v1/auth/logout" method="POST" className={compact ? '' : 'mt-3'}>
          <button
            type="submit"
            title={compact ? 'Sign out' : undefined}
            className={[
              'flex w-full items-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950',
              compact ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-3',
            ].join(' ')}
          >
            <span className={['flex items-center', compact ? 'justify-center' : 'gap-3'].join(' ')}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!compact ? 'Sign out' : null}
            </span>
            {!compact ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
          </button>
        </form>
      </div>
    </div>
  )
}

export function Sidebar({ userRole, firmName, userFirstName, userLastName }: SidebarProps) {
  const pathname = usePathname()
  const { collapsed, mobileOpen, closeMobileSidebar, toggleSidebar } = useDashboardShell()
  const visible = NAV_ITEMS.filter((item) => canAccess(item, userRole))
  const sections = buildSections(visible)

  useEffect(() => {
    closeMobileSidebar()
  }, [pathname, closeMobileSidebar])

  return (
    <>
      <aside className={['hidden lg:block lg:shrink-0 lg:py-4', collapsed ? 'lg:w-[5.5rem] lg:px-2.5' : 'lg:w-[18rem] lg:px-4'].join(' ')}>
        <SidebarInner
          compact={collapsed}
          pathname={pathname}
          sections={sections}
          firmName={firmName}
          userRole={userRole}
          userFirstName={userFirstName}
          userLastName={userLastName}
          onToggle={toggleSidebar}
        />
      </aside>

      <aside
        className={[
          'fixed inset-0 z-40 transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-[110%]',
        ].join(' ')}
      >
        <SidebarInner
          compact={false}
          mobile
          pathname={pathname}
          sections={sections}
          firmName={firmName}
          userRole={userRole}
          userFirstName={userFirstName}
          userLastName={userLastName}
          onNavigate={closeMobileSidebar}
          onClose={closeMobileSidebar}
          onToggle={toggleSidebar}
        />
      </aside>
    </>
  )
}
