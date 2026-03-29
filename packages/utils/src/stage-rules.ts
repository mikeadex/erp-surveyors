import type { CaseStage } from '@valuation-os/types'

export interface StageRule {
  requires?: string[]
  requiresInspectionSubmitted?: boolean
  requiresComparables?: boolean
  requiresAnalysisComplete?: boolean
  requiresReportDraft?: boolean
  requiresReportApproved?: boolean
  requiresInvoice?: boolean
  requiresPayment?: boolean
}

export const STAGE_TRANSITION_RULES: Partial<Record<CaseStage, StageRule>> = {
  inspection_scheduled: {
    requires: ['dueDate', 'assignedValuerId'],
  },
  inspection_completed: {
    requiresInspectionSubmitted: true,
  },
  comparable_analysis: {
    requiresComparables: true,
  },
  draft_report: {
    requiresAnalysisComplete: true,
  },
  review: {
    requiresReportDraft: true,
    requires: ['assignedReviewerId'],
  },
  final_issued: {
    requiresReportApproved: true,
  },
  invoice_sent: {
    requiresInvoice: true,
  },
  payment_received: {
    requiresPayment: true,
  },
}

export const STAGE_ORDER: CaseStage[] = [
  'enquiry_received',
  'quote_issued',
  'instruction_accepted',
  'case_opened',
  'inspection_scheduled',
  'inspection_completed',
  'comparable_analysis',
  'draft_report',
  'review',
  'final_issued',
  'invoice_sent',
  'payment_received',
  'archived',
]

export function getStageIndex(stage: CaseStage): number {
  return STAGE_ORDER.indexOf(stage)
}

export function isValidTransition(from: CaseStage, to: CaseStage): boolean {
  const fromIdx = getStageIndex(from)
  const toIdx = getStageIndex(to)
  return toIdx === fromIdx + 1 || to === 'archived'
}
