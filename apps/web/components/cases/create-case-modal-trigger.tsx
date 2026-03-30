'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { NewCaseForm } from '@/components/cases/new-case-form'

interface SelectOption {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  type?: string
  address?: string
  city?: string
  state?: string
  role?: string
}

interface CreateCaseModalTriggerProps {
  clients: SelectOption[]
  properties: SelectOption[]
  valuers: SelectOption[]
  branches: SelectOption[]
}

export function CreateCaseModalTrigger({
  clients,
  properties,
  valuers,
  branches,
}: CreateCaseModalTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        New Case
      </button>

      {open ? (
        <ModalShell
          title="New Case"
          description="Open a new instruction without leaving the case pipeline."
          onClose={() => setOpen(false)}
          widthClassName="max-w-5xl"
        >
          <NewCaseForm
            clients={clients}
            properties={properties}
            valuers={valuers}
            branches={branches}
            onCancel={() => setOpen(false)}
          />
        </ModalShell>
      ) : null}
    </>
  )
}
