import Link from 'next/link'

interface SavedView {
  key: string
  label: string
  description: string
  count: number
  href: string
  active: boolean
}

interface ClientSavedViewsProps {
  views: SavedView[]
}

export function ClientSavedViews({ views }: ClientSavedViewsProps) {
  if (views.length === 0) return null

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Saved Views</h2>
          <p className="mt-1 text-xs text-gray-500">
            Jump to common CRM slices without rebuilding filters each time.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {views.map((view) => (
          <Link
            key={view.key}
            href={view.href}
            className={`rounded-xl border px-4 py-3 transition-colors ${
              view.active
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${view.active ? 'text-blue-900' : 'text-gray-900'}`}>
                  {view.label}
                </p>
                <p className={`mt-1 text-xs ${view.active ? 'text-blue-700' : 'text-gray-500'}`}>
                  {view.description}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  view.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {view.count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
