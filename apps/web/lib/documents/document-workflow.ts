import { prisma } from '@/lib/db/prisma'
import { Errors } from '@/lib/api/errors'

export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
])

function sanitizeFileToken(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

export function inferDocumentExtension(name: string, mimeType: string) {
  const explicitExtension = name.split('.').pop()?.trim().toLowerCase()
  if (explicitExtension && explicitExtension !== name.toLowerCase()) {
    return sanitizeFileToken(explicitExtension) || 'bin'
  }

  const fromMime: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  }

  return fromMime[mimeType] ?? 'bin'
}

export function buildDocumentStorageKey({
  firmId,
  fileName,
  mimeType,
}: {
  firmId: string
  fileName: string
  mimeType: string
}) {
  const now = new Date()
  const extension = inferDocumentExtension(fileName, mimeType)
  const baseName = sanitizeFileToken(fileName.replace(/\.[^.]+$/, '')) || 'document'

  return [
    'documents',
    firmId,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    `${Date.now()}-${baseName}-${crypto.randomUUID()}.${extension}`,
  ].join('/')
}

export function buildDocumentVisibilityWhere(scopedBranchId?: string) {
  if (!scopedBranchId) return undefined

  return {
    OR: [
      { case: { branchId: scopedBranchId } },
      { client: { branchId: scopedBranchId } },
      {
        AND: [
          { caseId: null },
          { clientId: null },
        ],
      },
    ],
  }
}

export async function resolveDocumentLinks({
  firmId,
  scopedBranchId,
  caseId,
  clientId,
  propertyId,
}: {
  firmId: string
  scopedBranchId: string | undefined
  caseId: string | null | undefined
  clientId: string | null | undefined
  propertyId: string | null | undefined
}) {
  const caseRecord = caseId
    ? await prisma.case.findFirst({
        where: {
          id: caseId,
          firmId,
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        },
        select: { id: true, clientId: true, propertyId: true, branchId: true },
      })
    : null
  if (caseId && !caseRecord) {
    throw Errors.BAD_REQUEST('Selected case does not belong to your firm or branch')
  }

  const clientRecord = clientId
    ? await prisma.client.findFirst({
        where: {
          id: clientId,
          firmId,
          deletedAt: null,
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        },
        select: { id: true, branchId: true },
      })
    : null
  if (clientId && !clientRecord) {
    throw Errors.BAD_REQUEST('Selected client does not belong to your firm or branch')
  }

  const propertyRecord = propertyId
    ? await prisma.property.findFirst({
        where: {
          id: propertyId,
          firmId,
          deletedAt: null,
        },
        select: { id: true, clientId: true },
      })
    : null
  if (propertyId && !propertyRecord) {
    throw Errors.BAD_REQUEST('Selected property does not belong to your firm')
  }

  if (caseRecord && clientId && caseRecord.clientId !== clientId) {
    throw Errors.BAD_REQUEST('Selected client does not match the chosen case')
  }

  if (caseRecord && propertyId && caseRecord.propertyId !== propertyId) {
    throw Errors.BAD_REQUEST('Selected property does not match the chosen case')
  }

  const resolvedClientId = clientId ?? caseRecord?.clientId ?? null
  const resolvedPropertyId = propertyId ?? caseRecord?.propertyId ?? null

  if (propertyRecord?.clientId && resolvedClientId && propertyRecord.clientId !== resolvedClientId) {
    throw Errors.BAD_REQUEST('Selected property does not belong to the chosen client')
  }

  if (!caseRecord && !resolvedClientId && !resolvedPropertyId) {
    throw Errors.BAD_REQUEST('Link the document to a case, client, or property')
  }

  return {
    caseRecord,
    clientRecord,
    propertyRecord,
    resolvedClientId,
    resolvedPropertyId,
  }
}
