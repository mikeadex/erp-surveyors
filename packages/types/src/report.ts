export type ReportStatus = 'draft' | 'submitted_for_review' | 'approved' | 'rejected' | 'final'

export type BasisOfValue = 'market_value' | 'fair_value' | 'investment_value' | 'liquidation_value'

export type ValuationMethod =
  | 'sales_comparison'
  | 'income_capitalisation'
  | 'discounted_cash_flow'
  | 'cost'
  | 'profits'
  | 'residual'

export type ReviewCommentType = 'blocking' | 'suggestion' | 'informational'

export interface ValuationAssumption {
  id: string
  text: string
}

export interface ValuationAnalysis {
  id: string
  caseId: string
  firmId: string
  method: ValuationMethod
  basisOfValue: BasisOfValue
  assumptions: ValuationAssumption[]
  specialAssumptions: ValuationAssumption[]
  comparableGrid: Record<string, unknown>
  commentary: string | null
  concludedValue: string | null
  valuationDate: string | null
  status: 'in_progress' | 'complete'
  createdAt: string
  updatedAt: string
}

export interface ReportTemplate {
  id: string
  firmId: string
  name: string
  valuationType: string
  templateHtml: string
  defaultAssumptions: ValuationAssumption[]
  defaultDisclaimers: ValuationAssumption[]
  isActive: boolean
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  caseId: string
  firmId: string
  templateId: string | null
  status: ReportStatus
  version: number
  renderedHtml: string | null
  s3Key: string | null
  generatedAt: string | null
  approvedById: string | null
  approvedAt: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ReviewComment {
  id: string
  reportId: string
  firmId: string
  authorId: string
  type: ReviewCommentType
  body: string
  isResolved: boolean
  resolvedById: string | null
  resolvedAt: string | null
  createdAt: string
}
