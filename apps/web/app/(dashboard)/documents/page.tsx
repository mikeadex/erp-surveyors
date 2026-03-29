import { Suspense } from 'react'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { formatDate } from '@valuation-os/utils'
import { FileText, Image, File } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  page?: string
  search?: string
  caseId?: string
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType === 'application/pdf') return FileText
  return File
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) redirect('/login')

  const session = await verifyAccessToken(token).catch(() => null)
  if (!session) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = 25
  const skip = (page - 1) * pageSize
  const search = params.search?.trim()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  const where = {
    firmId: session.firmId,
    deletedAt: null,
    ...(params.caseId ? { caseId: params.caseId } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: {
        id: true, name: true, mimeType: true, sizeBytes: true,
        caseId: true, createdAt: true,
        case: { select: { id: true, reference: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header user={user} title="Documents" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search documents…"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Case', 'Type', 'Size', 'Uploaded', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No documents found.
                  </td>
                </tr>
              ) : (
                items.map((doc: typeof items[0]) => {
                  const Icon = fileIcon(doc.mimeType)
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {doc.case ? (
                          <Link
                            href={`/cases/${doc.case.id}`}
                            className="font-mono text-blue-600 hover:underline"
                          >
                            {doc.case.reference}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 font-mono">
                        {doc.mimeType.split('/')[1]?.toUpperCase() ?? doc.mimeType}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatBytes(doc.sizeBytes)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <a
                          href={`/api/v1/documents/${doc.id}/download`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
          </Suspense>
        )}
      </div>
    </>
  )
}
