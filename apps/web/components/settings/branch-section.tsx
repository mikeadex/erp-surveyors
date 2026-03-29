'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, PowerOff, Loader2 } from 'lucide-react'
import { BranchModal } from './branch-modal'

interface Branch {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  isActive: boolean
}

interface BranchSectionProps {
  branches: Branch[]
}

export function BranchSection({ branches }: BranchSectionProps) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<Branch | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggleActive(branch: Branch) {
    setToggling(branch.id)
    await fetch(`/api/v1/branches/${branch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !branch.isActive }),
    })
    setToggling(null)
    router.refresh()
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Branches</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add branch
        </button>
      </div>

      <ul className="divide-y divide-gray-100">
        {branches.map((b) => (
          <li key={b.id} className={`flex items-center justify-between px-5 py-3 ${!b.isActive ? 'opacity-50' : ''}`}>
            <div>
              <p className="text-sm font-medium text-gray-900">{b.name}</p>
              <p className="text-xs text-gray-500">
                {[b.address, b.city, b.state].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                b.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {b.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => setEditTarget(b)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Edit branch"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => toggleActive(b)}
                disabled={toggling === b.id}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                title={b.isActive ? 'Deactivate branch' : 'Reactivate branch'}
              >
                {toggling === b.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <PowerOff className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          </li>
        ))}
        {branches.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-gray-400">
            No branches yet — add your first branch above
          </li>
        )}
      </ul>

      {showAdd && <BranchModal onClose={() => setShowAdd(false)} />}
      {editTarget && <BranchModal branch={editTarget} onClose={() => setEditTarget(null)} />}
    </section>
  )
}
