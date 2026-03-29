import { z } from 'zod'

const trimmedOptionalString = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined)

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().optional(),
  phone: trimmedOptionalString(30),
  role: trimmedOptionalString(100),
  isPrimary: z.boolean().optional(),
})

const TagsSchema = z.array(z.string().trim().min(1).max(50)).max(20).optional()

export const CreateClientSchema = z.object({
  branchId: z.string().uuid().optional(),
  type: z.enum(['individual', 'corporate']),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().optional(),
  phone: trimmedOptionalString(30),
  address: trimmedOptionalString(400),
  city: trimmedOptionalString(100),
  state: trimmedOptionalString(100),
  rcNumber: trimmedOptionalString(50),
  notes: trimmedOptionalString(4000),
  tags: TagsSchema,
  contacts: z.array(ContactSchema).optional(),
})

export const UpdateClientSchema = CreateClientSchema.omit({ contacts: true }).partial()

export const CreateContactSchema = ContactSchema
export const UpdateContactSchema = ContactSchema.partial()

export type CreateClientInput = z.infer<typeof CreateClientSchema>
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>
export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
