export interface Firm {
  id: string
  name: string
  slug: string
  rcNumber: string | null
  esvarNumber: string | null
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  logoKey: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Branch {
  id: string
  firmId: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type NigeriaState =
  | 'Abia' | 'Adamawa' | 'Akwa Ibom' | 'Anambra' | 'Bauchi'
  | 'Bayelsa' | 'Benue' | 'Borno' | 'Cross River' | 'Delta'
  | 'Ebonyi' | 'Edo' | 'Ekiti' | 'Enugu' | 'FCT' | 'Gombe'
  | 'Imo' | 'Jigawa' | 'Kaduna' | 'Kano' | 'Katsina' | 'Kebbi'
  | 'Kogi' | 'Kwara' | 'Lagos' | 'Nasarawa' | 'Niger' | 'Ogun'
  | 'Ondo' | 'Osun' | 'Oyo' | 'Plateau' | 'Rivers' | 'Sokoto'
  | 'Taraba' | 'Yobe' | 'Zamfara'
