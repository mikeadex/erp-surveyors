'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, UserX, UserCheck, Loader2 } from 'lucide-react'
import { ROLE_LABELS } from '@valuation-os/utils'
import type { UserRole } from '@valuation-os/types'

const ROLES = Object.keys(ROLE_LABELS) as UserRole[]

interface Branch {
  id: string
  name: string
}

interface UserActionsMenuProps {
  userId: string
  currentRole: UserRole
  currentBranchId: string | null
  isActive: boolean
  isSelf: boolean
  branches: Branch[]
  canChangeRole: boolean
}

export function UserActionsMenu({
  userId,
  currentRole,
  currentBranchId,
  isActive,
  isSelf,
  branches,
  canChangeRole,
}: UserActionsMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranchId ?? '')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setError(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setSelectedRole(currentRole)
    setSelectedBranchId(currentBranchId ?? '')
  }, [currentBranchId, currentRole])

  useEffect(() => {
    if (selectedRole === 'managing_partner') {
      setSelectedBranchId('')
      return
    }

    if (!selectedBranchId && branches.length === 1) {
      setSelectedBranchId(branches[0]?.id ?? '')
    }
  }, [branches, selectedBranchId, selectedRole])

  if (isSelf) return null

  async function saveAssignment() {
    setLoading(true)
    setError(null)

    if (selectedRole !== 'managing_partner' && !selectedBranchId) {
      setLoading(false)
      setError('Select a branch for this role.')
      return
    }

    const payload: Record<string, unknown> = {}
    if (canChangeRole && selectedRole !== currentRole) {
      payload.role = selectedRole
    }
    if ((selectedRole === 'managing_partner' ? null : selectedBranchId || null) !== currentBranchId) {
      payload.branchId = selectedRole === 'managing_partner' ? null : selectedBranchId || null
    }

    if (Object.keys(payload).length === 0) {
      setLoading(false)
      setOpen(false)
      return
    }

    const res = await fetch(`/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Failed to update team member')
    }
  }

  async function toggleActive() {
    setLoading(true)
    setError(null)
    const res = await fetch(
      isActive ? `/api/v1/users/${userId}` : `/api/v1/users/${userId}/reactivate`,
      { method: isActive ? 'DELETE' : 'POST' },
    )
    setLoading(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json?.error?.message ?? 'Action failed')
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setOpen((o) => !o)
          setError(null)
          setSelectedRole(currentRole)
          setSelectedBranchId(currentBranchId ?? '')
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_22px_44px_-24px_rgba(15,23,42,0.35)]">
          <div className="space-y-3">
            <div className="rounded-[20px] bg-slate-50/70 p-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                disabled={!canChangeRole || loading}
                className="block w-full rounded-2xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[20px] bg-slate-50/70 p-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={selectedRole === 'managing_partner' || loading}
                className="block w-full rounded-2xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
              >
                <option value="">
                  {selectedRole === 'managing_partner' ? 'Managing partner is firm-wide' : 'Select branch…'}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Non-managing-partner staff must be assigned to a branch.
              </p>
            </div>

            {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

            <button
              onClick={saveAssignment}
              disabled={loading}
              className="w-full rounded-2xl bg-brand-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              Save Assignment
            </button>

            <div className="border-t border-slate-100 pt-2">
              <button
                onClick={toggleActive}
                className={`flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm transition hover:bg-slate-50 ${
                  isActive ? 'text-red-600' : 'text-brand-700'
                }`}
              >
                {isActive
                  ? <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                  : <><UserCheck className="h-3.5 w-3.5" /> Reactivate</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
