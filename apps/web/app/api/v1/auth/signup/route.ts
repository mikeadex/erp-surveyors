import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { getPasswordValidationErrors, hashPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/auth/session'
import { z } from 'zod'
import crypto from 'crypto'

const SignupSchema = z.object({
  firm: z.object({
    name: z.string().min(2).max(200),
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens'),
    rcNumber: z.string().max(50).optional(),
    esvarNumber: z.string().max(50).optional(),
    address: z.string().max(400).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().optional(),
  }),
  user: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(10, 'Password must be at least 10 characters'),
    phone: z.string().max(30).optional(),
    verificationCode: z.string().length(6, 'Verification code must be 6 digits'),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const body = SignupSchema.parse(await req.json())
    const normalizedEmail = body.user.email.toLowerCase()

    const [slugTaken, emailTaken, codeRecord] = await Promise.all([
      prisma.firm.findUnique({ where: { slug: body.firm.slug }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.verificationCode.findUnique({ where: { email: normalizedEmail } }),
    ])

    if (slugTaken) throw Errors.CONFLICT('A firm with that slug already exists')
    if (emailTaken) throw Errors.CONFLICT('An account with that email already exists')
    
    if (!codeRecord || codeRecord.code !== body.user.verificationCode) {
      throw Errors.BAD_REQUEST('Invalid verification code')
    }
    if (codeRecord.expiresAt < new Date()) {
      throw Errors.BAD_REQUEST('Verification code has expired')
    }

    const passwordErrors = getPasswordValidationErrors(body.user.password)
    if (passwordErrors.length > 0) {
      throw Errors.VALIDATION({
        'user.password': passwordErrors,
      })
    }

    const passwordHash = await hashPassword(body.user.password)

    const firm = await prisma.firm.create({
      data: {
        name: body.firm.name,
        slug: body.firm.slug,
        ...(body.firm.rcNumber ? { rcNumber: body.firm.rcNumber } : {}),
        ...(body.firm.esvarNumber ? { esvarNumber: body.firm.esvarNumber } : {}),
        ...(body.firm.address ? { address: body.firm.address } : {}),
        ...(body.firm.city ? { city: body.firm.city } : {}),
        ...(body.firm.state ? { state: body.firm.state } : {}),
        ...(body.firm.phone ? { phone: body.firm.phone } : {}),
        ...(body.firm.email ? { email: body.firm.email } : {}),
      },
    })

    const user = await prisma.user.create({
      data: {
        firmId: firm.id,
        email: body.user.email.toLowerCase(),
        passwordHash,
        firstName: body.user.firstName,
        lastName: body.user.lastName,
        role: 'managing_partner',
        ...(body.user.phone ? { phone: body.user.phone } : {}),
      },
      select: {
        id: true,
        firmId: true,
        branchId: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

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
      data: { refreshToken, refreshTokenExpiresAt: refreshExpiry, lastLoginAt: new Date() },
    })

    const response = ok({ accessToken, refreshToken, firm, user }, 201)

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

// Keep unused import happy in dev
void crypto
