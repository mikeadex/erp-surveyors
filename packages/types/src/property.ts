export type TenureType =
  | 'statutory_right_of_occupancy'
  | 'customary_right_of_occupancy'
  | 'leasehold'
  | 'freehold'
  | 'government_allocation'
  | 'other'

export type PropertyUse =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'agricultural'
  | 'mixed_use'
  | 'land'

export interface Property {
  id: string
  firmId: string
  address: string
  city: string
  state: string
  localGovernment: string | null
  propertyUse: PropertyUse
  tenureType: TenureType
  plotSize: string | null
  plotSizeUnit: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  createdById: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface PropertySummary {
  id: string
  address: string
  city: string
  state: string
  propertyUse: PropertyUse
  tenureType: TenureType
  deletedAt?: string | null
}
