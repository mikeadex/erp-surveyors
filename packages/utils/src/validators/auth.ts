import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const RegisterSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
  firmName: z.string().min(2).max(200),
})

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
})

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
})

export const PasswordResetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
})

export const PushTokenSchema = z.object({
  token: z.string().min(1).max(500),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>
export type PushTokenInput = z.infer<typeof PushTokenSchema>
