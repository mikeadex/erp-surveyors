import { NextRequest, NextResponse } from 'next/server'
import type { AuthSession } from '@valuation-os/types'
import { verifyAccessToken } from '@/lib/auth/session'
import { errorResponse } from './response'
import { Errors } from './errors'

export type AuthedRequest = NextRequest & { session: AuthSession }

type RouteHandler<TParams = Record<string, string>> = (
  req: AuthedRequest,
  ctx: { params: Promise<TParams> },
) => Promise<NextResponse>

/**
 * Wraps a route handler with JWT validation and injects session into request.
 */
export function withAuth<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>,
): (req: NextRequest, ctx: { params: Promise<TParams> }) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      const token = extractToken(req)
      if (!token) throw Errors.UNAUTHORIZED()

      const session = await verifyAccessToken(token)
      ;(req as AuthedRequest).session = session

      return await handler(req as AuthedRequest, ctx)
    } catch (err) {
      return errorResponse(err)
    }
  }
}

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return req.cookies.get('access_token')?.value ?? null
}
