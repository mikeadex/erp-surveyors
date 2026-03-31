'use client'

import { usePathname } from 'next/navigation'

interface PageRevealProps {
  children: React.ReactNode
}

export function PageReveal({ children }: PageRevealProps) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="page-reveal-shell">
      <div className="page-reveal">
        <div className="page-reveal-content">
          {children}
        </div>
      </div>
    </div>
  )
}
