'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Loader2, Paperclip } from 'lucide-react'

const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'
const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
  clientId: string | null
  address: string
  city: string
  state: string
}

function firstErrorMessage(json: any, fallback: string) {
  if (json?.error?.message) return json.error.message as string

  const details = json?.error?.details
  if (details && typeof details === 'object') {
    for (const value of Object.values(details as Record<string, unknown>)) {
      if (Array.isArray(value) && value[0]) return String(value[0])
    }
  }

  return fallback
}

export function DocumentUploadForm({
  cases,
  clients,
  properties,
  uploadConfigured,
  onCancel,
}: {
  cases: DocumentCaseOption[]
  clients: DocumentClientOption[]
  properties: DocumentPropertyOption[]
  uploadConfigured: boolean
  onCancel: () => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [caseId, setCaseId] = useState('')
  const [clientId, setClientId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCase = useMemo(
    () => cases.find((option) => option.id === caseId),
    [caseId, cases],
  )
  const effectiveClientId = selectedCase?.client.id ?? clientId
  const filteredProperties = useMemo(() => {
    if (!effectiveClientId) return properties
    return properties.filter((property) => property.clientId === effectiveClientId)
  }, [effectiveClientId, properties])

  const parsedTags = useMemo(
    () => tags.split(',').map((value) => value.trim()).filter(Boolean),
    [tags],
  )

  useEffect(() => {
    if (selectedCase) {
      if (clientId !== selectedCase.client.id) setClientId(selectedCase.client.id)
      if (propertyId !== selectedCase.property.id) setPropertyId(selectedCase.property.id)
    }
  }, [clientId, propertyId, selectedCase])

  useEffect(() => {
    if (!propertyId) return
    if (!filteredProperties.some((property) => property.id === propertyId)) {
      setPropertyId('')
    }
  }, [filteredProperties, propertyId])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null
    setErrorMsg(null)
    setFile(nextFile)

    if (!nextFile) return

    if (!name.trim()) {
      setName(nextFile.name)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMsg(null)

    if (!file) {
      setErrorMsg('Choose a file before uploading.')
      return
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setErrorMsg('Each document must be 50MB or smaller.')
      return
    }

    if (!uploadConfigured) {
      setErrorMsg('Document upload is not configured for this environment yet.')
      return
    }

    if (!caseId && !clientId && !propertyId) {
      setErrorMsg('Link the document to a case, client, or property before uploading.')
      return
    }

    let documentId: string | null = null

    try {
      setIsSubmitting(true)

      const createRes = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || file.name,
          category: category.trim() || undefined,
          tags: parsedTags.length > 0 ? parsedTags : undefined,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          caseId: caseId || undefined,
          clientId: clientId || undefined,
          propertyId: propertyId || undefined,
        }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) {
        setErrorMsg(firstErrorMessage(createJson, 'Failed to prepare the document upload.'))
        return
      }

      documentId = createJson.data.documentId as string

      const uploadRes = await fetch(createJson.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })
      if (!uploadRes.ok) {
        await fetch(`/api/v1/documents/${documentId}`, { method: 'DELETE' }).catch(() => null)
        setErrorMsg('The file upload did not complete successfully.')
        return
      }

      const confirmRes = await fetch('/api/v1/documents/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      const confirmJson = await confirmRes.json().catch(() => ({}))
      if (!confirmRes.ok) {
        await fetch(`/api/v1/documents/${documentId}`, { method: 'DELETE' }).catch(() => null)
        setErrorMsg(firstErrorMessage(confirmJson, 'The upload finished, but the document could not be confirmed.'))
        return
      }

      router.refresh()
      onCancel()
    } catch {
      if (documentId) {
        await fetch(`/api/v1/documents/${documentId}`, { method: 'DELETE' }).catch(() => null)
      }
      setErrorMsg('The document upload could not be completed right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">File And Metadata</h2>
          <p className="mt-1 text-xs text-slate-500">
            Upload the source file, then keep its category and tags easy to search later.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClassName}>File</label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Paperclip className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    {file ? file.name : 'Choose a file to upload'}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    PDF, Word, Excel, JPEG, or PNG up to 50MB. The uploaded document stays linked to its case context automatically.
                  </span>
                  {file ? (
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {formatBytes(file.size)}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="mt-4 inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
                {file ? 'Replace file' : 'Browse files'}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
              onChange={handleFileChange}
            />
          </div>

          <div className="rounded-[22px] border border-brand-100 bg-brand-50/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">Upload Flow</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/75 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">1. Link</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Choose the file and keep it tied to a case, client, or property.
                </p>
              </div>
              <div className="rounded-2xl bg-white/75 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">2. Upload</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  The file goes straight to storage without taking over this page.
                </p>
              </div>
              <div className="rounded-2xl bg-white/75 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">3. Confirm</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Only confirmed uploads appear in the vault, so incomplete placeholders stay hidden.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="document-name" className={labelClassName}>Document Name</label>
            <input
              id="document-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Signed instruction letter, title deed, inspection memo…"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="document-category" className={labelClassName}>Category</label>
            <input
              id="document-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="instruction, title, invoice, evidence…"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="document-tags" className={labelClassName}>Tags</label>
          <input
            id="document-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="priority, legal, site-photo-pack"
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-slate-400">Separate multiple tags with commas.</p>
        </div>
      </section>

      <section className={sectionClassName}>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Record Linkage</h2>
          <p className="mt-1 text-xs text-slate-500">
            Link every file to at least one case, client, or property so it stays discoverable across the workflow.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="document-case" className={labelClassName}>Case</label>
            <select
              id="document-case"
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
              className={inputClassName}
            >
              <option value="">No case selected</option>
              {cases.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.reference} · {option.client.name} · {option.property.city}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Choosing a case can automatically inherit its client and property on the server.
            </p>
          </div>

          {selectedCase ? (
            <div className="grid gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Case Client</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{selectedCase.client.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Case Property</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {selectedCase.property.address}, {selectedCase.property.city}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="document-client" className={labelClassName}>Client</label>
              <select
                id="document-client"
                value={clientId}
                onChange={(event) => {
                  const nextClientId = event.target.value
                  setClientId(nextClientId)
                  if (propertyId && !properties.some((property) => property.id === propertyId && property.clientId === nextClientId)) {
                    setPropertyId('')
                  }
                }}
                className={inputClassName}
                disabled={Boolean(selectedCase)}
              >
                <option value="">No client selected</option>
                {clients.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}{option.branchName ? ` · ${option.branchName}` : ''}
                  </option>
                ))}
              </select>
              {selectedCase ? (
                <p className="mt-1 text-xs text-slate-400">
                  Client is inherited from the selected case.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="document-property" className={labelClassName}>Property</label>
              <select
                id="document-property"
                value={propertyId}
                onChange={(event) => {
                  const nextPropertyId = event.target.value
                  setPropertyId(nextPropertyId)
                  const selectedProperty = properties.find((option) => option.id === nextPropertyId)
                  if (selectedProperty?.clientId && !selectedCase) {
                    setClientId(selectedProperty.clientId)
                  }
                }}
                className={`${inputClassName} ${!effectiveClientId && !selectedCase ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 focus:border-slate-200 focus:ring-0' : ''}`}
                disabled={Boolean(selectedCase) || !effectiveClientId}
              >
                <option value="">
                  {!effectiveClientId && !selectedCase
                    ? 'Select client first…'
                    : selectedCase
                    ? 'Case property selected automatically'
                    : effectiveClientId && filteredProperties.length === 0
                      ? 'No properties found for this client'
                      : 'No property selected'}
                </option>
                {filteredProperties.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.address}, {option.city}, {option.state}
                  </option>
                ))}
              </select>
              {!effectiveClientId && !selectedCase ? (
                <p className="mt-1 text-xs text-slate-400">
                  Choose a client first so we can show only that client’s properties.
                </p>
              ) : null}
              {effectiveClientId && !selectedCase ? (
                <p className="mt-1 text-xs text-slate-400">
                  Showing only properties linked to the selected client.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {errorMsg ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {!uploadConfigured ? (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Storage upload is not configured yet in this environment, so new document uploads are currently disabled.
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !uploadConfigured}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Upload Document
        </button>
      </div>
    </form>
  )
}
