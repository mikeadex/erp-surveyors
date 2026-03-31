'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

interface DashboardShellContextValue {
  collapsed: boolean
  mobileOpen: boolean
  isDesktop: boolean
  toggleSidebar: () => void
  closeMobileSidebar: () => void
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null)

const STORAGE_KEY = 'valucore-africa.sidebar-collapsed'
const DESKTOP_BREAKPOINT = 1024

export function DashboardShellProvider({
  children,
}: {
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const updateViewport = () => {
      const nextDesktop = window.innerWidth >= DESKTOP_BREAKPOINT
      setIsDesktop(nextDesktop)
      if (nextDesktop) {
        setMobileOpen(false)
      }
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') {
      setCollapsed(true)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const toggleSidebar = useCallback(() => {
    if (isDesktop) {
      setCollapsed((current) => !current)
      return
    }

    setMobileOpen((current) => !current)
  }, [isDesktop])

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      collapsed,
      mobileOpen,
      isDesktop,
      toggleSidebar,
      closeMobileSidebar,
    }),
    [closeMobileSidebar, collapsed, isDesktop, mobileOpen, toggleSidebar],
  )

  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  )
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext)

  if (!context) {
    throw new Error('useDashboardShell must be used within DashboardShellProvider')
  }

  return context
}
