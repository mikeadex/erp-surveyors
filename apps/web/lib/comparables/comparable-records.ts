import type { Prisma } from '@prisma/client'

type ComparablePayload = {
  address?: string | undefined
  city?: string | undefined
  state?: string | undefined
  propertyUse?: string | undefined
  tenureType?: string | undefined
  transactionDate?: string | undefined
  plotSize?: number | undefined
  plotSizeUnit?: string | undefined
  buildingSize?: number | undefined
  buildingSizeUnit?: string | undefined
  source?: string | undefined
  sourceContact?: string | undefined
  notes?: string | undefined
  salePrice?: number | undefined
  rentalValue?: number | undefined
}

function normalizeSearch(value?: string | null): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function tokenizeSearch(value?: string | null): string[] {
  return Array.from(
    new Set(
      normalizeSearch(value)
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  )
}

export function normalizeComparableText(value?: string | null): string | undefined {
  const normalized = (value ?? '').trim()
  return normalized.length > 0 ? normalized : undefined
}

export function buildComparableSearchWhere(search?: string | null): Prisma.ComparableWhereInput | undefined {
  const terms = tokenizeSearch(search)
  if (terms.length === 0) return undefined

  return {
    AND: terms.map((term) => ({
      OR: [
        { address: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { state: { contains: term, mode: 'insensitive' } },
        { propertyUse: { contains: term, mode: 'insensitive' } },
        { tenureType: { contains: term, mode: 'insensitive' } },
        { source: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ],
    })),
  }
}

function toSqm(size: number, unit?: string): number {
  switch (unit) {
    case 'sqft':
      return size * 0.092903
    case 'hectare':
      return size * 10000
    case 'acres':
      return size * 4046.8564224
    case 'sqm':
    case undefined:
    default:
      return size
  }
}

export function normalizeComparablePayload<T extends ComparablePayload>(payload: T): T {
  const normalized = { ...payload }

  if ('address' in normalized) normalized.address = normalizeComparableText(payload.address)
  if ('city' in normalized) normalized.city = normalizeComparableText(payload.city)
  if ('state' in normalized) normalized.state = normalizeComparableText(payload.state)
  if ('propertyUse' in normalized) normalized.propertyUse = normalizeComparableText(payload.propertyUse)
  if ('tenureType' in normalized) normalized.tenureType = normalizeComparableText(payload.tenureType)
  if ('transactionDate' in normalized) {
    normalized.transactionDate = payload.transactionDate
      ? new Date(payload.transactionDate).toISOString()
      : undefined
  }
  if ('source' in normalized) normalized.source = normalizeComparableText(payload.source)
  if ('sourceContact' in normalized) normalized.sourceContact = normalizeComparableText(payload.sourceContact)
  if ('notes' in normalized) normalized.notes = normalizeComparableText(payload.notes)

  if (typeof payload.plotSize === 'number') {
    normalized.plotSize = Number(toSqm(payload.plotSize, payload.plotSizeUnit).toFixed(4))
    normalized.plotSizeUnit = 'sqm'
  }

  if (typeof payload.buildingSize === 'number') {
    normalized.buildingSize = Number(toSqm(payload.buildingSize, payload.buildingSizeUnit).toFixed(4))
    normalized.buildingSizeUnit = 'sqm'
  }

  const primarySize = normalized.buildingSize ?? normalized.plotSize
  if (typeof normalized.salePrice === 'number' && typeof primarySize === 'number' && primarySize > 0) {
    ;(normalized as T & { pricePerSqm?: number }).pricePerSqm = Number((normalized.salePrice / primarySize).toFixed(2))
  }

  return normalized
}
