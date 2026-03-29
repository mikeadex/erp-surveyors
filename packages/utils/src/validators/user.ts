import { z } from 'zod'

const UserRoleSchema = z.enum([
  'managing_partner',
  'reviewer',
  'valuer',
  'admin',
  'finance',
  'field_officer',
])

export const InviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: UserRoleSchema,
  branchId: z.string().uuid().optional(),
})

export const UpdateUserSchema = z.object({
  role: UserRoleSchema.optional(),
  branchId: z.string().uuid().nullable().optional(),
  phone: z.string().max(30).optional(),
  isActive: z.boolean().optional(),
})

export const CreateBranchSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(400).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
})

export const UpdateBranchSchema = CreateBranchSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const UpdateFirmSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  rcNumber: z.string().max(50).optional(),
  esvarNumber: z.string().max(50).optional(),
  address: z.string().max(400).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
})

export type InviteUserInput = z.infer<typeof InviteUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type CreateBranchInput = z.infer<typeof CreateBranchSchema>
export type UpdateFirmInput = z.infer<typeof UpdateFirmSchema>
