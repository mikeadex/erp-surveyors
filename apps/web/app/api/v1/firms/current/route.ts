import { withAuth, type AuthedRequest } from '@/lib/api/with-auth'
import { prisma } from '@/lib/db/prisma'
import { ok, errorResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { requireRole } from '@/lib/auth/guards'
import { z } from 'zod'

const UpdateFirmSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  rcNumber: z.string().max(50).optional(),
  esvarNumber: z.string().max(50).optional(),
  address: z.string().max(400).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
})

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const firm = await prisma.firm.findUnique({
      where: { id: req.session.firmId },
      include: {
        branches: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, city: true, state: true, isActive: true },
        },
        _count: { select: { users: true, clients: true, cases: true } },
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

    const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))

    const updated = await prisma.firm.update({
      where: { id: req.session.firmId },
      data,
    })

    return ok(updated)
  } catch (err) {
    return errorResponse(err)
  }
})
