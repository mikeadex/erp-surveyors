'use client'

import { useState } from 'react'
import { Edit3 } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { InvoiceForm } from '@/components/invoices/invoice-form'

export function EditInvoiceModalTrigger({
  invoice,
}: {
  invoice: {
    id: string
    invoiceNumber: string
    caseId: string
    clientId: string
    clientName: string
    amount: string
    currency: string
    taxRate: string | null
    dueDate: string | null
    notes: string | null
  }
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Edit3 className="h-4 w-4" />
        Edit Draft
      </button>

      {open ? (
        <ModalShell
          title="Edit Draft Invoice"
          description="Update the commercial terms before the invoice is issued."
          onClose={() => setOpen(false)}
          widthClassName="max-w-4xl"
        >
          <InvoiceForm
            mode="edit"
            initial={invoice}
            onCancel={() => setOpen(false)}
          />
        </ModalShell>
      ) : null}
    </>
  )
}
