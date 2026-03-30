'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { NewClientForm } from '@/components/clients/new-client-form'

interface BranchOption {
  id: string
  name: string
}

interface CreateClientModalTriggerProps {
  branches: BranchOption[]
  initialBranchId?: string | undefined
  canSelectBranch: boolean
}

export function CreateClientModalTrigger({
  branches,
  initialBranchId,
  canSelectBranch,
}: CreateClientModalTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        New Client
      </button>

      {open && (
        <ModalShell
          title="New Client"
          description="Create a client record without leaving the CRM list."
          onClose={() => setOpen(false)}
          widthClassName="max-w-4xl"
        >
          <NewClientForm
            branches={branches}
            initialBranchId={initialBranchId}
            canSelectBranch={canSelectBranch}
            onCancel={() => setOpen(false)}
          />
        </ModalShell>
      )}
    </>
  )
}
