import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/session'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/reset-password',
  '/accept-invite',
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/signup/send-code',
  '/api/v1/auth/refresh',
  '/api/v1/auth/accept-invite',
  '/api/v1/auth/password/reset',
  '/api/v1/auth/password/confirm',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (isPublic) return NextResponse.next()

  const token =
    req.cookies.get('access_token')?.value ??
    req.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      )
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await verifyAccessToken(token)
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Token expired or invalid' } },
        { status: 401 },
      )
    }
    const url = new URL('/login', req.url)
    url.searchParams.set('expired', '1')
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
