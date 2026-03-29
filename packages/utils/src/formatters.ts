import type { CaseStage, ValuationType, UserRole } from '@valuation-os/types'

export function formatCurrency(
  amount: string | number | null | undefined,
  currency = 'NGN',
): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDate(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const STAGE_LABELS: Record<CaseStage, string> = {
  enquiry_received: 'Enquiry Received',
  quote_issued: 'Quote Issued',
  instruction_accepted: 'Instruction Accepted',
  case_opened: 'Case Opened',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_completed: 'Inspection Completed',
  comparable_analysis: 'Comparable Analysis',
  draft_report: 'Draft Report',
  review: 'Under Review',
  final_issued: 'Final Issued',
  invoice_sent: 'Invoice Sent',
  payment_received: 'Payment Received',
  archived: 'Archived',
}

export const VALUATION_TYPE_LABELS: Record<ValuationType, string> = {
  market: 'Market Value',
  rental: 'Rental Value',
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  probate: 'Probate',
  commercial: 'Commercial',
  land: 'Land',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  managing_partner: 'Managing Partner',
  reviewer: 'Senior Reviewer',
  valuer: 'Valuer / Surveyor',
  admin: 'Admin / Operations',
  finance: 'Finance Officer',
  field_officer: 'Field Officer',
}

export function getCaseStageLabel(stage: CaseStage): string {
  return STAGE_LABELS[stage] ?? stage
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}
