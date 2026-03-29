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
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invite member
      </button>
      {open && <InviteUserForm branches={branches} onClose={() => setOpen(false)} />}
    </>
  )
}
