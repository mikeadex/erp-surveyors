'use client'

import Link from 'next/link'
import { formatDate } from '@valuation-os/utils'
import { Building2, User } from 'lucide-react'

export interface ClientRow {
  id: string
  type: 'individual' | 'corporate'
  name: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  createdAt: string
  _count: { cases: number }
}

interface ClientsTableProps {
  clients: ClientRow[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">No clients found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Client', 'Contact', 'Location', 'Cases', 'Added', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 rounded-full bg-gray-100 p-1.5">
                    {c.type === 'corporate' ? (
                      <Building2 className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-gray-500" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.type}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <p>{c.email ?? '—'}</p>
                <p className="text-xs text-gray-400">{c.phone ?? ''}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {[c.city, c.state].filter(Boolean).join(', ') || '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-medium">
                {c._count.cases}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {formatDate(c.createdAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link
                  href={`/clients/${c.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
