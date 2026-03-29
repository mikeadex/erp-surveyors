import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { requireRole } from '@/lib/auth/guards'
import { Errors } from '@/lib/api/errors'
import { UpdateFirmSchema } from '@valuation-os/utils'

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const firm = await prisma.firm.findUnique({
      where: { id: req.session.firmId },
      select: {
        id: true, name: true, slug: true, rcNumber: true, esvarNumber: true,
        address: true, city: true, state: true, phone: true, email: true,
        logoKey: true, isActive: true, createdAt: true, updatedAt: true,
      },
    })
    if (!firm) throw Errors.NOT_FOUND('Firm')
    return ok(firm)
  } catch (err) {
    return errorResponse(err)
  }
})

export const PATCH = withAuth(async (req: AuthedRequest) => {
  try {
    requireRole(req.session.role, ['managing_partner'])
    const body = UpdateFirmSchema.parse(await req.json())

    const data = Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== undefined),
    )
    const firm = await prisma.firm.update({
      where: { id: req.session.firmId },
      data,
      select: {
        id: true, name: true, slug: true, rcNumber: true, esvarNumber: true,
        address: true, city: true, state: true, phone: true, email: true,
        logoKey: true, updatedAt: true,
      },
    })
    return ok(firm)
  } catch (err) {
    return errorResponse(err)
  }
})
