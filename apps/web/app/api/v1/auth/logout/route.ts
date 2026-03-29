import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyAccessToken } from '@/lib/auth/session'
import { ok, errorResponse } from '@/lib/api/response'

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get('Authorization')?.replace('Bearer ', '') ??
      req.cookies.get('access_token')?.value

    if (token) {
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

    const response = ok({ message: 'Logged out' })
    response.cookies.delete({ name: 'access_token', path: '/' })
    response.cookies.delete({ name: 'refresh_token', path: '/api/v1/auth/refresh' })
    return response
  } catch (err) {
    return errorResponse(err)
  }
}
