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
        className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.2)] transition-colors hover:border-brand-200 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="surface-panel absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-[26px]">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              <p className="mt-1 text-xs text-slate-500">Recent workflow activity across your firm.</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto px-2 py-2">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-400">
                No notifications yet
              </li>
            ) : (
              items.slice(0, 10).map((n) => (
                <li
                  key={n.id}
                  className={[
                    'flex gap-3 rounded-2xl px-4 py-3.5',
                    !n.readAt ? 'bg-brand-50/70' : 'hover:bg-white/90',
                  ].join(' ')}
                >
                  {!n.readAt && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                  )}
                  <div className={!n.readAt ? '' : 'pl-5'}>
                    <p className="text-sm font-medium leading-snug text-slate-900">{n.title}</p>
                    {n.body && (
                      <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">{formatDate(n.createdAt)}</p>
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
