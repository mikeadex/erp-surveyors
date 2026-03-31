import type { NextRequest } from 'next/server'
import { Errors } from './errors'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  namespace: string
  limit: number
  windowMs: number
  key?: string | null
}

declare global {
  // eslint-disable-next-line no-var
  var __voRateLimitStore: Map<string, RateLimitEntry> | undefined
}

function getRateLimitStore() {
  globalThis.__voRateLimitStore ??= new Map<string, RateLimitEntry>()
  return globalThis.__voRateLimitStore
}

export function getRequestIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return forwarded || realIp || 'unknown'
}

export function buildRateLimitKey(req: NextRequest, parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(':')
}

export function assertRateLimit(req: NextRequest, options: RateLimitOptions) {
  const key = options.key?.trim()
  if (!key) return

  const store = getRateLimitStore()
  const now = Date.now()
  const compoundKey = `${options.namespace}:${key}`
  const current = store.get(compoundKey)

  if (!current || current.resetAt <= now) {
    store.set(compoundKey, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    throw Errors.TOO_MANY_REQUESTS(
      'Too many requests for this action. Please wait a moment and try again.',
      retryAfterSeconds,
    )
  }

  current.count += 1
  store.set(compoundKey, current)
}

