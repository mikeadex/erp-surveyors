import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      checkedAt: new Date().toISOString(),
      service: 'valucore-africa-web',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        checkedAt: new Date().toISOString(),
        service: 'valucore-africa-web',
        message: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 },
    )
  }
}
