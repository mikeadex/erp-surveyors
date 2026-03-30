'use client'

import { useRef, useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'

interface InspectionMediaManagerProps {
  caseId: string
  inspectionId: string
  items: {
    id: string
    s3Key: string
    caption: string | null
  }[]
  configured: boolean
  uploadConfigured: boolean
  isSubmitted: boolean
}

const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024

export function InspectionMediaManager({
  caseId,
  inspectionId,
  items,
  configured,
  uploadConfigured,
  isSubmitted,
}: InspectionMediaManagerProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [busyMediaId, setBusyMediaId] = useState<string | null>(null)

  function refreshAfter() {
    startTransition(() => router.refresh())
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('Only image uploads are supported.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Each inspection photo must be 25MB or smaller.')
      event.target.value = ''
      return
    }

    if (!uploadConfigured) {
      setError('Storage upload is not configured for this environment yet.')
      event.target.value = ''
      return
    }

    try {
      setUploading(true)
      const createRes = await fetch(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'other',
          fileType: file.type,
          caption: caption.trim() || undefined,
        }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) {
        setError(createJson?.error?.message ?? 'Failed to prepare image upload')
        event.target.value = ''
        return
      }
      const mediaId = createJson.data.mediaId as string

      const uploadRes = await fetch(createJson.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })
      if (!uploadRes.ok) {
        await fetch(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media/${mediaId}`, {
          method: 'DELETE',
        }).catch(() => null)
        setError('The image upload did not complete successfully.')
        event.target.value = ''
        return
      }

      const confirmRes = await fetch(
        `/api/v1/cases/${caseId}/inspections/${inspectionId}/media/${mediaId}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caption: caption.trim() || undefined,
            takenAt: new Date().toISOString(),
          }),
        },
      )
      const confirmJson = await confirmRes.json().catch(() => ({}))
      if (!confirmRes.ok) {
        await fetch(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media/${mediaId}`, {
          method: 'DELETE',
        }).catch(() => null)
        setError(confirmJson?.error?.message ?? 'The upload finished, but the media could not be confirmed.')
        event.target.value = ''
        return
      }

      setCaption('')
      event.target.value = ''
      refreshAfter()
    } catch {
      setError('The image upload could not be completed right now.')
      event.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(mediaId: string) {
    setBusyMediaId(mediaId)
    setError(null)

    const res = await fetch(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media/${mediaId}`, {
      method: 'DELETE',
    })
    const json = await res.json().catch(() => ({}))
    setBusyMediaId(null)

    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to remove the inspection photo')
      return
    }

    refreshAfter()
  }

  return (
    <div className="space-y-4">
      {isSubmitted ? (
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
          This inspection is already submitted, so the photo register is now read-only.
        </div>
      ) : (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Caption</label>
              <input
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Front facade, access road, living room finish…"
                className="block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || isPending || !uploadConfigured}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Photo
              </button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <p className="mt-3 text-xs text-slate-500">
            Upload images directly to storage. Large mobile photos should be compressed before upload.
          </p>
          {!uploadConfigured ? (
            <p className="mt-2 text-xs text-amber-700">
              Upload is ready in code, but this environment still needs storage credentials before it can issue presigned URLs.
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400">
          No inspection photos have been attached yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
              {configured ? (
                <Link href={`/api/v1/media/${item.s3Key}`} target="_blank" className="block bg-slate-100">
                  <div className="relative aspect-[4/3]">
                    <img
                      src={`/api/v1/media/${item.s3Key}`}
                      alt={item.caption ?? 'Inspection photo'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-slate-400">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}

              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                      <Camera className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-medium text-slate-800">
                      {item.caption?.trim() || 'Inspection photo'}
                    </p>
                  </div>
                  <p className="mt-2 truncate text-xs text-slate-400">{item.s3Key}</p>
                </div>

                {!isSubmitted ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={busyMediaId === item.id}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-600"
                    aria-label="Remove inspection photo"
                  >
                    {busyMediaId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
