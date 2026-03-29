'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className={`w-full ${widthClassName} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-1 text-xs text-gray-500">{description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
