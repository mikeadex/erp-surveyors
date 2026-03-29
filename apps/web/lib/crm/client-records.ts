import { Errors } from '@/lib/api/errors'

type DuplicateCandidate = {
  id: string
  name: string
  type: 'individual' | 'corporate'
  email: string | null
  phone: string | null
}

type DuplicateInput = {
  name: string
  email?: string | undefined
  phone?: string | undefined
}

type ContactInput = {
  name: string
  email?: string | undefined
  phone?: string | undefined
  role?: string | undefined
  isPrimary?: boolean | undefined
}

function normalize(value?: string | null): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function trigramSet(value: string): Set<string> {
  const normalized = `  ${normalize(value)}  `
  const grams = new Set<string>()
  for (let i = 0; i < normalized.length - 2; i += 1) {
    grams.add(normalized.slice(i, i + 3))
  }
  return grams
}

function trigramSimilarity(left?: string, right?: string): number {
  const a = trigramSet(left ?? '')
  const b = trigramSet(right ?? '')

  if (a.size === 0 || b.size === 0) return 0

  let overlap = 0
  for (const gram of a) {
    if (b.has(gram)) overlap += 1
  }

  return (2 * overlap) / (a.size + b.size)
}

export function normalizeClientTags(tags?: string[]): string[] {
  const normalized = (tags ?? [])
    .map((tag) => normalize(tag))
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

export function normalizeClientContacts<T extends ContactInput>(contacts?: T[]): T[] {
  const normalized = (contacts ?? [])
    .map((contact) => ({
      ...contact,
      name: contact.name.trim(),
      email: contact.email?.trim().toLowerCase() || undefined,
      phone: contact.phone?.trim() || undefined,
      role: contact.role?.trim() || undefined,
      isPrimary: Boolean(contact.isPrimary),
    }))
    .filter((contact) => contact.name.length > 0) as T[]

  const primaryCount = normalized.filter((contact) => contact.isPrimary).length
  if (primaryCount > 1) {
    throw Errors.BAD_REQUEST('Only one contact can be marked as primary')
  }

  if (normalized.length === 1 && primaryCount === 0) {
    normalized[0].isPrimary = true
  }

  return normalized
}

export function findClientDuplicateMatches(
  input: DuplicateInput,
  candidates: DuplicateCandidate[],
  threshold = 0.7,
) {
  const inputName = normalize(input.name)
  const inputEmail = normalize(input.email)
  const inputPhone = normalize(input.phone)

  return candidates
    .map((candidate) => {
      const score = Math.max(
        inputName && candidate.name ? trigramSimilarity(inputName, candidate.name) : 0,
        inputEmail && candidate.email && inputEmail === normalize(candidate.email) ? 1 : 0,
        inputPhone && candidate.phone && inputPhone === normalize(candidate.phone) ? 1 : 0,
      )

      return {
        id: candidate.id,
        name: candidate.name,
        type: candidate.type,
        email: candidate.email,
        phone: candidate.phone,
        score: Number(score.toFixed(2)),
      }
    })
    .filter((candidate) => candidate.score >= threshold)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
}
