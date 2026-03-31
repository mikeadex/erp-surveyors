'use client'

import { X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalShellProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  widthClassName?: string
}

export function ModalShell({
  title,
  description,
  onClose,
  children,
  widthClassName = 'max-w-2xl',
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-6 backdrop-blur-md">
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <div className={`flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)] ${widthClassName}`}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
