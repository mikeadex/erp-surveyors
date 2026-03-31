import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { ok, errorResponse } from '@/lib/api/response'

async function revokeSession(req: NextRequest) {
  const token =
    req.headers.get('Authorization')?.replace('Bearer ', '') ??
    req.cookies.get('access_token')?.value

  if (!token) return

  try {
    const session = await verifyAccessToken(token)
    await prisma.user.updateMany({
      where: { id: session.userId, firmId: session.firmId },
      data: { refreshToken: null, refreshTokenExpiresAt: null },
    })
  } catch {
    // Token already expired — still clear cookies
  }
}

function clearAuthCookies<T extends NextResponse>(response: T) {
  response.cookies.delete({ name: 'access_token', path: '/' })
  response.cookies.delete({ name: 'refresh_token', path: '/api/v1/auth/refresh' })
  return response
}

export async function POST(req: NextRequest) {
  try {
    await revokeSession(req)
    return clearAuthCookies(ok({ message: 'Logged out' }))
  } catch (err) {
    return errorResponse(err)
  }
}

export async function GET(req: NextRequest) {
  try {
    await revokeSession(req)
    return clearAuthCookies(NextResponse.redirect(new URL('/login', req.url)))
  } catch (err) {
    return errorResponse(err)
  }
}
