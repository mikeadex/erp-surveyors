import { SignJWT, jwtVerify } from 'jose'
import type { AuthSession, UserRole } from '@valuation-os/types'

function resolveSecret(envName: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', fallback: string) {
  const value = process.env[envName]
  if (value) return new TextEncoder().encode(value)

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[auth] ${envName} is not set; using a development fallback secret`)
    return new TextEncoder().encode(fallback)
  }

  throw new Error(`${envName} must be configured in production`)
}

const accessSecret = resolveSecret(
  'JWT_ACCESS_SECRET',
  'fallback-dev-secret-do-not-use-in-prod',
)
const refreshSecret = resolveSecret(
  'JWT_REFRESH_SECRET',
  'fallback-dev-refresh-do-not-use-in-prod',
)

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'

export async function signAccessToken(payload: {
  userId: string
  firmId: string
  branchId: string | null
  role: UserRole
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(accessSecret)
}

export async function signRefreshToken(payload: {
  userId: string
  firmId: string
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(refreshSecret)
}

export async function verifyAccessToken(token: string): Promise<AuthSession> {
  const { payload } = await jwtVerify(token, accessSecret)
  return {
    ...(payload as unknown as AuthSession),
    branchId: (payload.branchId as string | null | undefined) ?? null,
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ userId: string; firmId: string }> {
  const { payload } = await jwtVerify(token, refreshSecret)
  return payload as { userId: string; firmId: string }
}

export function getAccessTokenExpiry(): Date {
  const ms = parseExpiresIn(ACCESS_EXPIRES)
  return new Date(Date.now() + ms)
}

export function getRefreshTokenExpiry(): Date {
  const ms = parseExpiresIn(REFRESH_EXPIRES)
  return new Date(Date.now() + ms)
}

function parseExpiresIn(expiresIn: string): number {
  const unit = expiresIn.slice(-1)
  const value = parseInt(expiresIn.slice(0, -1), 10)
  const map: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }
  return value * (map[unit] ?? 60_000)
}
