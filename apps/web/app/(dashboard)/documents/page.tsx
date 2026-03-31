import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Pagination } from '@/components/ui/pagination'
import { formatDate } from '@valuation-os/utils'
import { FileText, Image, File, Download, FolderOpen, UserRound, Building2, Tag } from 'lucide-react'
import { DocumentsFiltersBar } from '@/components/documents/documents-filters-bar'
import { CreateDocumentModalTrigger } from '@/components/documents/create-document-modal-trigger'
import { resolveScopedBranchId } from '@/lib/auth/branch-scope'
import { buildDocumentVisibilityWhere } from '@/lib/documents/document-workflow'
import { hasSignedStorageConfig } from '@/lib/storage/s3'

interface SearchParams {
  page?: string
  search?: string
  caseId?: string
  clientId?: string
  propertyId?: string
  category?: string
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
  const scopedBranchId = await resolveScopedBranchId(session).catch(() => undefined)
  const uploadConfigured = hasSignedStorageConfig()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  })
  if (!user) redirect('/login')

  const where = {
    firmId: session.firmId,
    deletedAt: null,
    confirmedAt: { not: null },
    ...(params.caseId ? { caseId: params.caseId } : {}),
    ...(params.clientId ? { clientId: params.clientId } : {}),
    ...(params.propertyId ? { propertyId: params.propertyId } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { category: { contains: search, mode: 'insensitive' as const } },
            { case: { reference: { contains: search, mode: 'insensitive' as const } } },
            { client: { name: { contains: search, mode: 'insensitive' as const } } },
            { property: { address: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
    ...(buildDocumentVisibilityWhere(scopedBranchId) ?? {}),
  }

  const [items, total, caseOptions, clientOptions, propertyOptions] = await Promise.all([
    prisma.document.findMany({
      where,
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        caseId: true,
        clientId: true,
        propertyId: true,
        category: true,
        tags: true,
        confirmedAt: true,
        createdAt: true,
        case: { select: { id: true, reference: true } },
        client: { select: { id: true, name: true } },
        property: { select: { id: true, address: true, city: true, state: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.count({ where }),
    prisma.case.findMany({
      where: {
        firmId: session.firmId,
        stage: { not: 'archived' },
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: {
        id: true,
        reference: true,
        client: { select: { id: true, name: true } },
        property: { select: { id: true, address: true, city: true } },
      },
      take: 80,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.client.findMany({
      where: {
        firmId: session.firmId,
        deletedAt: null,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: {
        id: true,
        name: true,
        branch: { select: { name: true } },
      },
      take: 120,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.property.findMany({
      where: {
        firmId: session.firmId,
        deletedAt: null,
      },
      select: {
        id: true,
        clientId: true,
        address: true,
        city: true,
        state: true,
      },
      take: 120,
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header user={user} title="Documents" />
      <div className="space-y-5 px-4 pb-6 lg:px-6">
        <section className="surface-card rounded-[30px] px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Document Vault
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Keep valuation files, evidence packs, and uploads easy to trace.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Upload supporting files once, keep them linked to the right records, and make retrieval easy for case, client, and property workflows.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <CreateDocumentModalTrigger
                cases={caseOptions}
                clients={clientOptions.map((client) => ({
                  id: client.id,
                  name: client.name,
                  branchName: client.branch?.name ?? null,
                }))}
                properties={propertyOptions}
                uploadConfigured={uploadConfigured}
              />
              {!uploadConfigured ? (
                <p className="text-xs text-amber-700">
                  Storage credentials are still needed before new uploads can be completed here.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <DocumentsFiltersBar search={search} caseId={params.caseId} />

        {items.length === 0 ? (
          <div className="surface-card rounded-[28px] p-12 text-center">
            <p className="text-sm text-slate-500">No documents found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 xl:hidden">
              {items.map((doc: typeof items[0]) => {
                const Icon = fileIcon(doc.mimeType)
                return (
                  <div key={doc.id} className="surface-card rounded-[28px] p-4 sm:p-5">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="flex shrink-0 rounded-2xl bg-slate-100 p-2.5">
                          <Icon className="h-4 w-4 text-slate-500" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold leading-8 text-slate-900">{doc.name}</p>
                          <p className="mt-0.5 text-sm text-slate-400">
                            {doc.mimeType.split('/')[1]?.toUpperCase() ?? doc.mimeType}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Linked Case
                          </p>
                          {doc.case ? (
                            <Link
                              href={`/cases/${doc.case.id}`}
                              className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                            >
                              <FolderOpen className="h-4 w-4" />
                              {doc.case.reference}
                            </Link>
                          ) : (
                            <p className="mt-1 text-sm text-slate-500">No linked case</p>
                          )}
                        </div>

                        <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            File
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatBytes(doc.sizeBytes)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Uploaded {formatDate(doc.createdAt)}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Client
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                            <UserRound className="h-4 w-4 text-slate-400" />
                            {doc.client?.name ?? 'No linked client'}
                          </p>
                        </div>

                        <div className="rounded-[22px] bg-slate-50/80 p-3.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Property
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {doc.property ? `${doc.property.address}, ${doc.property.city}` : 'No linked property'}
                          </p>
                        </div>
                      </div>

                      {doc.category || doc.tags.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {doc.category ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                              <Tag className="h-3 w-3" />
                              {doc.category}
                            </span>
                          ) : null}
                          {doc.tags.map((tag) => (
                            <span
                              key={`${doc.id}-${tag}`}
                              className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
                        <span className="text-slate-400">Download file</span>
                        <a
                          href={`/api/v1/documents/${doc.id}/download`}
                          className="inline-flex items-center gap-2 font-medium text-brand-700 hover:text-brand-800"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="surface-card hidden overflow-hidden rounded-[28px] xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Name', 'Case', 'Client / Property', 'Category', 'Type', 'Size', 'Uploaded', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((doc: typeof items[0]) => {
                    const Icon = fileIcon(doc.mimeType)
                    return (
                      <tr key={doc.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="max-w-[280px] px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {doc.name}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                          {doc.case ? (
                            <Link
                              href={`/cases/${doc.case.id}`}
                              className="font-mono text-brand-700 hover:underline"
                            >
                              {doc.case.reference}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="space-y-1">
                            <p>{doc.client?.name ?? '—'}</p>
                            <p className="text-xs text-slate-400">
                              {doc.property ? `${doc.property.address}, ${doc.property.city}` : 'No linked property'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="flex flex-wrap gap-2">
                            {doc.category ? (
                              <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                                {doc.category}
                              </span>
                            ) : null}
                            {doc.tags.slice(0, 2).map((tag) => (
                              <span
                                key={`${doc.id}-${tag}`}
                                className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                            {!doc.category && doc.tags.length === 0 ? '—' : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-500">
                          {doc.mimeType.split('/')[1]?.toUpperCase() ?? doc.mimeType}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                          {formatBytes(doc.sizeBytes)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                          {formatDate(doc.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                          <a
                            href={`/api/v1/documents/${doc.id}/download`}
                            className="font-medium text-brand-700 hover:text-brand-800"
                          >
                            Download
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <Suspense>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
          </Suspense>
        )}
      </div>
    </>
  )
}
