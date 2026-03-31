export interface Document {
  id: string
  firmId: string
  caseId: string | null
  clientId: string | null
  propertyId: string | null
  name: string
  category: string | null
  tags: string[]
  s3Key: string
  mimeType: string
  sizeBytes: number
  uploadedById: string
  confirmedAt: string | null
  deletedAt: string | null
  createdAt: string
}

export interface DocumentSummary {
  id: string
  name: string
  category: string | null
  mimeType: string
  sizeBytes: number
  caseId: string | null
  clientId: string | null
  propertyId: string | null
  confirmedAt: string | null
  createdAt: string
}
