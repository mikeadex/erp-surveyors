'use client'

import Link from 'next/link'
import { formatDate } from '@valuation-os/utils'
import { Building2, FileText, User } from 'lucide-react'
import { richTextToPlainText } from '@/lib/editor/rich-text'

export interface ClientRow {
  id: string
  branchId: string | null
  branch?: { id: string; name: string } | null
  type: 'individual' | 'corporate'
  name: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  notes?: string | null
  rcNumber?: string | null
  tags?: string[]
  createdAt: string
  deletedAt?: string | null
  _count: { cases: number }
}

interface ClientsTableProps {
  clients: ClientRow[]
}

function ClientBadges({ client }: { client: ClientRow }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-400 capitalize">{client.type}</span>
      {client.deletedAt ? (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          Archived
        </span>
      ) : null}
      {client.branch?.name ? (
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
          {client.branch.name}
        </span>
      ) : (
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
          Unassigned Branch
        </span>
      )}
      {client.tags?.slice(0, 2).map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

export function ClientsTable({ clients }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="surface-card rounded-[28px] p-12 text-center">
        <p className="text-sm text-slate-500">No clients found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 xl:hidden">
        {clients.map((client) => {
          const notesPreview = richTextToPlainText(client.notes)

          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="surface-card block rounded-[28px] p-4 transition-colors hover:bg-slate-50/70 sm:p-5"
            >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex shrink-0 rounded-2xl bg-slate-100 p-2.5">
                  {client.type === 'corporate' ? (
                    <Building2 className="h-4 w-4 text-slate-500" />
                  ) : (
                    <User className="h-4 w-4 text-slate-500" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold leading-8 text-slate-900">
                        {client.name}
                      </p>
                      <p className="mt-0.5 text-sm capitalize text-slate-400">{client.type}</p>
                      {client.rcNumber ? (
                        <p className="mt-1 text-xs font-mono text-slate-500">{client.rcNumber}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      {client._count.cases} cases
                    </span>
                  </div>

                  <ClientBadges client={client} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Contact
                  </p>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-700">
                    {client.email ?? 'No email'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{client.phone ?? 'No phone number'}</p>
                </div>

                <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Relationship
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {[client.city, client.state].filter(Boolean).join(', ') || 'No location yet'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Added {formatDate(client.createdAt)}</p>
                </div>
              </div>

              {notesPreview ? (
                <div className="flex items-start gap-2 rounded-[22px] bg-brand-50/50 px-3.5 py-3 text-sm leading-6 text-slate-600">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span className="line-clamp-3">{notesPreview}</span>
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-200 px-3.5 py-3 text-sm text-slate-400">
                  No relationship notes
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
                <span className="text-slate-400">Open client record</span>
                <span className="font-medium text-brand-700">View client</span>
              </div>
            </div>
            </Link>
          )
        })}
      </div>

      <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50/80">
          <tr>
            {['Client', 'Contact', 'Relationship', 'Cases', 'Added', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {clients.map((c) => {
            const notesPreview = richTextToPlainText(c.notes)

            return (
              <tr key={c.id} className="transition-colors hover:bg-slate-50/70">
              <td className="px-4 py-4 align-top">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 rounded-2xl bg-slate-100 p-2">
                    {c.type === 'corporate' ? (
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <ClientBadges client={c} />
                    {c.rcNumber && (
                      <p className="mt-1 text-xs font-mono text-slate-500">{c.rcNumber}</p>
                    )}
                    {c.tags && c.tags.length > 2 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.tags.slice(2, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 align-top text-sm text-slate-700">
                <p className="break-all">{c.email ?? '—'}</p>
                <p className="mt-1 text-xs text-slate-400">{c.phone ?? ''}</p>
              </td>
              <td className="px-4 py-4 align-top text-sm text-slate-700">
                <p>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</p>
                {notesPreview ? (
                  <div className="mt-2 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <span className="line-clamp-2">{notesPreview}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No relationship notes</p>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm font-semibold text-slate-900">
                {c._count.cases}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-500">
                {formatDate(c.createdAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right align-top text-sm">
                <Link
                  href={`/clients/${c.id}`}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  View →
                </Link>
              </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}
