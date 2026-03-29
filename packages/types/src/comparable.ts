export type ComparableType = 'sales' | 'rental' | 'land'

export type ImportJobStatus =
  | 'pending'
  | 'processing'
  | 'complete'
  | 'partial_failure'
  | 'failed'

export interface ComparableImportError {
  row: number
  error: string
}

export interface Comparable {
  id: string
  firmId: string
  comparableType: ComparableType
  address: string
  city: string | null
  state: string | null
  propertyUse: string | null
  tenureType: string | null
  transactionDate: string | null
  salePrice: string | null
  rentalValue: string | null
  plotSize: string | null
  plotSizeUnit: string | null
  buildingSize: string | null
  buildingSizeUnit: string | null
  pricePerSqm: string | null
  source: string | null
  sourceContact: string | null
  notes: string | null
  isVerified: boolean
  addedById: string
  createdAt: string
  updatedAt: string
}

export interface ComparableImportJob {
  id: string
  firmId: string
  fileKey: string
  status: ImportJobStatus
  importedCount: number
  failedCount: number
  errors: ComparableImportError[]
  createdById: string
  createdAt: string
  updatedAt: string
}
