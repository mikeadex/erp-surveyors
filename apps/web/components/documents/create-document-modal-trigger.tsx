'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { DocumentUploadForm } from '@/components/documents/document-upload-form'

interface DocumentCaseOption {
  id: string
  reference: string
  client: {
    id: string
    name: string
  }
  property: {
    id: string
    address: string
    city: string
  }
}

interface DocumentClientOption {
  id: string
  name: string
  branchName: string | null
}

interface DocumentPropertyOption {
  id: string
  address: string
  city: string
  state: string
}

export function CreateDocumentModalTrigger({
  cases,
  clients,
  properties,
  uploadConfigured,
}: {
  cases: DocumentCaseOption[]
  clients: DocumentClientOption[]
  properties: DocumentPropertyOption[]
  uploadConfigured: boolean
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
        Upload Document
      </button>

      {open ? (
        <ModalShell
          title="Upload Document"
          description="Add a document to the vault and link it to the right case, client, or property."
          onClose={() => setOpen(false)}
          widthClassName="max-w-4xl"
        >
          <DocumentUploadForm
            cases={cases}
            clients={clients}
            properties={properties}
            uploadConfigured={uploadConfigured}
            onCancel={() => setOpen(false)}
          />
        </ModalShell>
      ) : null}
    </>
  )
}
