'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileUp, Loader2, Upload } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { buildComparableImportTemplate } from '@/lib/comparables/comparable-import'

type ImportJobResult = {
  id: string
  fileKey: string
  status: 'pending' | 'processing' | 'complete' | 'partial_failure' | 'failed'
  importedCount: number
  failedCount: number
  errors: Array<{ row: number; error: string }>
  createdAt: string
}

const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'

export function ImportComparablesModalTrigger({
  buttonClassName,
  label = 'Import CSV',
}: {
  buttonClassName?: string
  label?: string
} = {}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<ImportJobResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const template = useMemo(() => buildComparableImportTemplate(), [])

  function downloadTemplate() {
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'comparables-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function submitImport() {
    if (!file) {
      setErrorMsg('Choose a CSV file before importing.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/v1/comparables/import', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErrorMsg(json?.error?.message ?? 'Failed to import comparables')
        return
      }

      setResult(json.data.job)
      router.refresh()
    } catch {
      setErrorMsg('Failed to import comparables')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName ?? secondaryButtonClassName}
      >
        <Upload className="h-4 w-4" />
        {label}
      </button>

      {open ? (
        <ModalShell
          title="Import Comparables"
          description="Upload a CSV to add multiple market evidence records in one pass."
          onClose={() => setOpen(false)}
          widthClassName="max-w-3xl"
        >
          <div className="space-y-5">
            <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">How it works</h3>
                  <ol className="space-y-1 text-sm leading-6 text-slate-600">
                    <li>1. Download the template and fill one comparable per row.</li>
                    <li>2. Upload the CSV once from this modal.</li>
                    <li>3. The system validates each row and creates an import job record.</li>
                    <li>4. You get imported counts and row-specific errors for anything that failed.</li>
                  </ol>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className={secondaryButtonClassName}
                >
                  <Download className="h-4 w-4" />
                  Template
                </button>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                CSV File
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
                <FileUp className="h-7 w-7 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {file ? file.name : 'Choose comparables CSV'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Supported format: `.csv` with one evidence record per row
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </section>

            {errorMsg ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMsg}
              </div>
            ) : null}

            {result ? (
              <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Latest import result</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {result.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">
                      {result.importedCount} imported
                    </span>
                    <span className="rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-700">
                      {result.failedCount} failed
                    </span>
                  </div>
                </div>

                {result.errors.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {result.errors.slice(0, 8).map((item) => (
                      <div
                        key={`${item.row}-${item.error}`}
                        className="rounded-2xl border border-red-100 bg-white px-3.5 py-3 text-sm text-slate-700"
                      >
                        <span className="font-semibold text-red-600">Row {item.row}</span>
                        <span className="text-slate-500"> — {item.error}</span>
                      </div>
                    ))}
                    {result.errors.length > 8 ? (
                      <p className="text-xs text-slate-500">
                        Showing the first 8 row errors. Use the recent imports panel on the page to review the rest.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Every row imported successfully.
                  </p>
                )}
              </section>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={secondaryButtonClassName}
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitImport}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-800 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import Comparables
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  )
}
