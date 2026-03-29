export type CaseStage =
  | 'enquiry_received'
  | 'quote_issued'
  | 'instruction_accepted'
  | 'case_opened'
  | 'inspection_scheduled'
  | 'inspection_completed'
  | 'comparable_analysis'
  | 'draft_report'
  | 'review'
  | 'final_issued'
  | 'invoice_sent'
  | 'payment_received'
  | 'archived'

export type ValuationType =
  | 'market'
  | 'rental'
  | 'mortgage'
  | 'insurance'
  | 'probate'
  | 'commercial'
  | 'land'

export interface CaseChecklistItem {
  id: string
  caseId: string
  label: string
  isChecked: boolean
  checkedById: string | null
  checkedAt: string | null
}

export interface Case {
  id: string
  firmId: string
  branchId: string | null
  reference: string
  clientId: string
  propertyId: string
  valuationType: ValuationType
  valuationPurpose: string | null
  assignedValuerId: string
  assignedReviewerId: string | null
  stage: CaseStage
  dueDate: string | null
  feeAmount: string | null
  feeCurrency: string
  isOverdue: boolean
  internalNotes: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface CaseSummary {
  id: string
  reference: string
  clientId: string
  propertyId: string
  valuationType: ValuationType
  assignedValuerId: string
  stage: CaseStage
  dueDate: string | null
  isOverdue: boolean
}
