import type { Prisma } from '@prisma/client'

type DuplicateCandidate = {
  id: string
  address: string
  city: string
  state: string
}

type DuplicateInput = {
  address: string
  city: string
  state: string
}

type PropertyPayload = {
  clientId?: string | null | undefined
  address?: string | undefined
  city?: string | undefined
  state?: string | undefined
  localGovernment?: string | undefined
  propertyUse?: string | undefined
  tenureType?: string | undefined
  plotSize?: number | undefined
  plotSizeUnit?: string | undefined
  description?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
}

type ComparableCandidate = {
  id: string
  comparableType: string
  address: string
  city: string | null
  state: string | null
  propertyUse: string | null
  tenureType: string | null
  salePrice: Prisma.Decimal | null
  rentalValue: Prisma.Decimal | null
  transactionDate: Date | null
  isVerified: boolean
  createdAt: Date
}

type PropertyComparableContext = {
  city: string
  state: string
  propertyUse: string
  tenureType: string
}

export function normalizePropertyText(value?: string | null): string | undefined {
  const normalized = (value ?? '').trim()
  return normalized.length > 0 ? normalized : undefined
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

export function buildPropertySearchWhere(search?: string | null): Prisma.PropertyWhereInput | undefined {
  const terms = tokenizeSearch(search)
  if (terms.length === 0) return undefined

  return {
    AND: terms.map((term) => ({
      OR: [
        { address: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { state: { contains: term, mode: 'insensitive' } },
        { localGovernment: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    })),
  }
}

function normalizeDuplicateKey(input: DuplicateInput): string {
  return [input.address, input.city, input.state]
    .map((part) => normalizeSearch(part))
    .filter(Boolean)
    .join(' ')
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0
  if (left.length === 0) return right.length
  if (right.length === 0) return left.length

  const matrix = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0))

  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[left.length][right.length]
}

export function findPropertyDuplicateMatches(
  input: DuplicateInput,
  candidates: DuplicateCandidate[],
  threshold = 3,
) {
  const target = normalizeDuplicateKey(input)

  return candidates
    .map((candidate) => {
      const distance = levenshteinDistance(
        target,
        normalizeDuplicateKey({
          address: candidate.address,
          city: candidate.city,
          state: candidate.state,
        }),
      )

      return {
        id: candidate.id,
        address: candidate.address,
        city: candidate.city,
        state: candidate.state,
        distance,
      }
    })
    .filter((candidate) => candidate.distance <= threshold)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 5)
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

export function normalizePropertyPayload<T extends PropertyPayload>(payload: T): T {
  const normalized = { ...payload }

  if ('address' in normalized) normalized.address = normalizePropertyText(payload.address)
  if ('city' in normalized) normalized.city = normalizePropertyText(payload.city)
  if ('state' in normalized) normalized.state = normalizePropertyText(payload.state)
  if ('localGovernment' in normalized) normalized.localGovernment = normalizePropertyText(payload.localGovernment)
  if ('description' in normalized) normalized.description = normalizePropertyText(payload.description)

  if (typeof payload.plotSize === 'number') {
    normalized.plotSize = Number(toSqm(payload.plotSize, payload.plotSizeUnit).toFixed(4))
    normalized.plotSizeUnit = 'sqm'
  }

  return normalized
}

function normalizeComparableField(value?: string | null): string {
  return normalizeSearch(value)
}

export function rankComparablesForProperty(
  property: PropertyComparableContext,
  candidates: ComparableCandidate[],
) {
  const normalizedCity = normalizeComparableField(property.city)
  const normalizedState = normalizeComparableField(property.state)
  const normalizedUse = normalizeComparableField(property.propertyUse)
  const normalizedTenure = normalizeComparableField(property.tenureType)

  return candidates
    .map((candidate) => {
      let score = 0

      if (normalizeComparableField(candidate.state) === normalizedState) score += 2
      if (normalizeComparableField(candidate.city) === normalizedCity) score += 3
      if (candidate.propertyUse && normalizeComparableField(candidate.propertyUse) === normalizedUse) score += 2
      if (candidate.tenureType && normalizeComparableField(candidate.tenureType) === normalizedTenure) score += 1
      if (candidate.isVerified) score += 1

      return {
        ...candidate,
        score,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      const rightTime = right.transactionDate?.getTime() ?? right.createdAt.getTime()
      const leftTime = left.transactionDate?.getTime() ?? left.createdAt.getTime()
      return rightTime - leftTime
    })
}
