'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { NewPropertyForm } from '@/components/properties/new-property-form'

export function CreatePropertyModalTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        Add Property
      </button>

      {open ? (
        <ModalShell
          title="Add Property"
          description="Create a new property record without leaving the registry view."
          onClose={() => setOpen(false)}
          widthClassName="max-w-4xl"
        >
          <NewPropertyForm onCancel={() => setOpen(false)} />
        </ModalShell>
      ) : null}
    </>
  )
}
