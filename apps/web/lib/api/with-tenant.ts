import { NextResponse } from 'next/server'
import { tenantPrisma, type TenantPrisma } from '@/lib/db/tenant'
import type { AuthedRequest } from './with-auth'

export type TenantRequest = AuthedRequest & {
  firmId: string
  db: TenantPrisma
}

type TenantRouteHandler<TParams = Record<string, string>> = (
  req: TenantRequest,
  ctx: { params: Promise<TParams> },
) => Promise<NextResponse>

export function withTenant<TParams = Record<string, string>>(
  handler: TenantRouteHandler<TParams>,
): (req: AuthedRequest, ctx: { params: Promise<TParams> }) => Promise<NextResponse> {
  return async (req, ctx) => {
    const tenantReq = req as TenantRequest
    tenantReq.firmId = req.session.firmId
    tenantReq.db = tenantPrisma(req.session.firmId)
    return handler(tenantReq, ctx)
  }
}
