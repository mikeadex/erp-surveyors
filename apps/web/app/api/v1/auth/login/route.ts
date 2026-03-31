import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/auth/session'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { LoginSchema } from '@valuation-os/utils'
import { assertRateLimit, buildRateLimitKey, getRequestIp } from '@/lib/api/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const body = LoginSchema.parse(await req.json())
    const ip = getRequestIp(req)
    const email = body.email.toLowerCase()

    assertRateLimit(req, {
      namespace: 'auth-login-ip',
      limit: 20,
      windowMs: 10 * 60 * 1000,
      key: buildRateLimitKey(req, [ip]),
    })
    assertRateLimit(req, {
      namespace: 'auth-login-email',
      limit: 5,
      windowMs: 10 * 60 * 1000,
      key: buildRateLimitKey(req, [ip, email]),
    })

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firmId: true,
        branchId: true,
        role: true,
        passwordHash: true,
        isActive: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!user || !user.isActive) {
      throw Errors.UNAUTHORIZED()
    }

    const passwordValid = await verifyPassword(body.password, user.passwordHash)
    if (!passwordValid) {
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

    const refreshExpiry = getRefreshTokenExpiry()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExpiresAt: refreshExpiry,
        lastLoginAt: new Date(),
      },
    })

    const response = ok({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firmId: user.firmId,
        branchId: user.branchId,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    })

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
