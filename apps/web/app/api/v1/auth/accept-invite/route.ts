import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { getPasswordValidationErrors, hashPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/auth/session'
import { z } from 'zod'

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  confirmPassword: z.string().min(1),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function POST(req: NextRequest) {
  try {
    const body = AcceptInviteSchema.parse(await req.json())

    const user = await prisma.user.findFirst({
      where: {
        invitationToken: body.token,
        invitationExpiresAt: { gt: new Date() },
      },
      select: {
        id: true, firmId: true, branchId: true, role: true, email: true,
        firstName: true, lastName: true, isActive: true,
      },
    })

    if (!user) throw Errors.VALIDATION({ token: ['Invalid or expired invitation link'] })

    const passwordErrors = getPasswordValidationErrors(body.password)
    if (passwordErrors.length > 0) {
      throw Errors.VALIDATION({ password: passwordErrors })
    }

    const passwordHash = await hashPassword(body.password)

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

    const updateData: Record<string, unknown> = {
      passwordHash,
      invitationToken: null,
      invitationExpiresAt: null,
      isActive: true,
      refreshToken,
      refreshTokenExpiresAt: refreshExpiry,
      lastLoginAt: new Date(),
    }
    if (body.firstName) updateData.firstName = body.firstName
    if (body.lastName) updateData.lastName = body.lastName
    if (body.phone) updateData.phone = body.phone

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.user.update({ where: { id: user.id }, data: updateData as any })

    const response = ok({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firmId: user.firmId,
        branchId: user.branchId,
        role: user.role,
        email: user.email,
        firstName: body.firstName ?? user.firstName,
        lastName: body.lastName ?? user.lastName,
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
