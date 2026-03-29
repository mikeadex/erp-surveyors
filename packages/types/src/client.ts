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

export interface Client {
  id: string
  firmId: string
  type: ClientType
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  rcNumber: string | null
  contacts: Contact[]
  createdAt: string
  updatedAt: string
}

export interface ClientSummary {
  id: string
  name: string
  type: ClientType
  email: string | null
  phone: string | null
}
