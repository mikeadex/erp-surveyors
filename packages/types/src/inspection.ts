export type InspectionStatus = 'draft' | 'submitted'

export interface InspectionMedia {
  id: string
  inspectionId: string
  s3Key: string
  caption: string | null
  takenAt: string | null
  sortOrder: number
}

export interface Inspection {
  id: string
  caseId: string
  firmId: string
  inspectedById: string
  status: InspectionStatus
  inspectionDate: string | null
  externalCondition: string | null
  internalCondition: string | null
  services: string | null
  conditionSummary: string | null
  locationDescription: string | null
  occupancy: string | null
  notes: string | null
  offlineDraft: Record<string, unknown> | null
  submittedAt: string | null
  media: InspectionMedia[]
  createdAt: string
  updatedAt: string
}
