'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { InvoiceForm } from '@/components/invoices/invoice-form'

interface EligibleCaseOption {
  id: string
  reference: string
  stage: string
  client: {
    id: string
    name: string
  }
}

export function CreateInvoiceModalTrigger({
  eligibleCases,
}: {
  eligibleCases: EligibleCaseOption[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        New Invoice
      </button>

      {open ? (
        <ModalShell
          title="New Invoice"
          description="Create a draft invoice without leaving the finance register."
          onClose={() => setOpen(false)}
          widthClassName="max-w-4xl"
        >
          <InvoiceForm
            mode="create"
            eligibleCases={eligibleCases}
            onCancel={() => setOpen(false)}
          />
        </ModalShell>
      ) : null}
    </>
  )
}
