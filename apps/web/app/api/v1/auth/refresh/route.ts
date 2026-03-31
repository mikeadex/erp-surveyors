import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyRefreshToken, signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/auth/session'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { assertRateLimit, buildRateLimitKey, getRequestIp } from '@/lib/api/rate-limit'

export async function POST(req: NextRequest) {
  try {
    assertRateLimit(req, {
      namespace: 'auth-refresh',
      limit: 30,
      windowMs: 10 * 60 * 1000,
      key: buildRateLimitKey(req, [getRequestIp(req)]),
    })

    const token =
      req.cookies.get('refresh_token')?.value ??
      req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) throw Errors.UNAUTHORIZED()

    const payload = await verifyRefreshToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        firmId: true,
        branchId: true,
        role: true,
        isActive: true,
        refreshToken: true,
        refreshTokenExpiresAt: true,
      },
    })

    if (
      !user ||
      user.firmId !== payload.firmId ||
      !user.isActive ||
      user.refreshToken !== token ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt < new Date()
    ) {
      throw Errors.UNAUTHORIZED()
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({
        userId: user.id,
        firmId: user.firmId,
        branchId: user.branchId,
        role: user.role,
      }),
      signRefreshToken({ userId: user.id, firmId: user.firmId }),
    ])

    await prisma.user.updateMany({
      where: { id: user.id, firmId: user.firmId },
      data: { refreshToken, refreshTokenExpiresAt: getRefreshTokenExpiry() },
    })

    const response = ok({ accessToken, refreshToken })
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 15,
    })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (err) {
    return errorResponse(err)
  }
}
