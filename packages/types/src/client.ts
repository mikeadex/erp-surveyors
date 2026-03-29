export type ClientType = 'individual' | 'corporate'

export interface Contact {
  id: string
  clientId: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

export interface ClientDuplicateMatch {
  id: string
  name: string
  type: ClientType
  email: string | null
  phone: string | null
  rcNumber: string | null
  score: number
}

export interface Client {
  id: string
  firmId: string
  branchId: string | null
  type: ClientType
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  rcNumber: string | null
  notes: string | null
  tags: string[]
  contacts: Contact[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ClientSummary {
  id: string
  branchId?: string | null
  branchName?: string | null
  name: string
  type: ClientType
  email: string | null
  phone: string | null
  tags?: string[]
}
