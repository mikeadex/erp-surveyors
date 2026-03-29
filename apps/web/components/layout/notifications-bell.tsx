'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { formatDate } from '@valuation-os/utils'

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  readAt: string | null
  createdAt: string
  entityType: string
  entityId: string
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/v1/notifications?unread=false')
      if (!res.ok) return
      const json = await res.json()
      setItems(json.data?.items ?? [])
      setUnreadCount(json.data?.unreadCount ?? 0)
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    setLoading(true)
    try {
      await fetch('/api/v1/notifications/read-all', { method: 'POST' })
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </li>
            ) : (
              items.slice(0, 10).map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 ${!n.readAt ? 'bg-blue-50/40' : ''}`}
                >
                  {!n.readAt && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  )}
                  <div className={!n.readAt ? '' : 'pl-5'}>
                    <p className="text-xs font-medium text-gray-900 leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">{formatDate(n.createdAt)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
