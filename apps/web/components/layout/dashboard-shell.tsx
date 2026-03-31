'use client'

import { Sidebar } from './sidebar'
import { DashboardShellProvider, useDashboardShell } from './dashboard-shell-context'
import type { UserRole } from '@valuation-os/types'
import { PageReveal } from './page-reveal'

interface DashboardShellProps {
  children: React.ReactNode
  userRole: UserRole
  firmName: string
  userFirstName: string
  userLastName: string
}

function DashboardShellFrame({ children, userRole, firmName, userFirstName, userLastName }: DashboardShellProps) {
  const { mobileOpen, closeMobileSidebar } = useDashboardShell()

  return (
    <div className="relative flex min-h-screen bg-transparent">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}
      <Sidebar
        userRole={userRole}
        firmName={firmName}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-2.5 py-2.5 transition-all duration-200 sm:px-4 sm:py-4 lg:pr-5">
        <main className="min-w-0 flex-1 overflow-y-auto rounded-[28px] border border-white/50 bg-white/45 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.24)] backdrop-blur-[8px] sm:rounded-[32px]">
          <PageReveal>{children}</PageReveal>
        </main>
      </div>
    </div>
  )
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <DashboardShellProvider>
      <DashboardShellFrame {...props} />
    </DashboardShellProvider>
  )
}
