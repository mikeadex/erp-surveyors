'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { InviteUserForm } from './invite-user-form'

interface Branch {
  id: string
  name: string
}

interface TeamActionsProps {
  branches: Branch[]
}

export function TeamActions({ branches }: TeamActionsProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-700"
      >
        <UserPlus className="h-4 w-4" />
        Invite member
      </button>
      {open && <InviteUserForm branches={branches} onClose={() => setOpen(false)} />}
    </>
  )
}
