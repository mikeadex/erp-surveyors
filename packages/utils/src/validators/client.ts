import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
})

export const CreateClientSchema = z.object({
  type: z.enum(['individual', 'corporate']),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(400).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  rcNumber: z.string().max(50).optional(),
  contacts: z.array(ContactSchema).optional(),
})

export const UpdateClientSchema = CreateClientSchema.partial()

export const CreateContactSchema = ContactSchema

export type CreateClientInput = z.infer<typeof CreateClientSchema>
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>
export type CreateContactInput = z.infer<typeof CreateContactSchema>
