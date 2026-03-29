export type UserRole =
  | 'managing_partner'
  | 'reviewer'
  | 'valuer'
  | 'admin'
  | 'finance'
  | 'field_officer'

export interface User {
  id: string
  firmId: string
  branchId: string | null
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: UserRole
  isActive: boolean
  lastLoginAt: string | null
  expoPushToken: string | null
  createdAt: string
  updatedAt: string
}

export interface UserSummary {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  isActive: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthSession {
  userId: string
  firmId: string
  branchId: string | null
  role: UserRole
  iat: number
  exp: number
}
