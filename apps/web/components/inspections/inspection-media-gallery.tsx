import Link from 'next/link'
import { Camera, ExternalLink } from 'lucide-react'

interface InspectionMediaGalleryProps {
  items: {
    id: string
    s3Key: string
    caption: string | null
  }[]
  configured: boolean
  emptyCopy?: string
}

export function InspectionMediaGallery({
  items,
  configured,
  emptyCopy = 'No inspection photos yet.',
}: InspectionMediaGalleryProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400">
        {emptyCopy}
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="rounded-[22px] border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-800">
        Photos exist for this inspection, but public storage access is not configured in this environment yet.
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/api/v1/media/${item.s3Key}`}
          target="_blank"
          className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white transition hover:border-brand-200"
        >
          <div className="relative aspect-[4/3] bg-slate-100">
            <img
              src={`/api/v1/media/${item.s3Key}`}
              alt={item.caption ?? 'Inspection photo'}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
            <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm">
              <ExternalLink className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Camera className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {item.caption?.trim() || 'Inspection photo'}
              </p>
              <p className="mt-1 truncate text-xs text-slate-400">{item.s3Key}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
