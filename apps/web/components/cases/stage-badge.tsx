import { getCaseStageLabel } from '@valuation-os/utils'
import type { CaseStage } from '@valuation-os/types'

const STAGE_COLORS: Record<CaseStage, string> = {
  enquiry_received:      'bg-gray-100 text-gray-700',
  quote_issued:          'bg-blue-50 text-blue-700',
  instruction_accepted:  'bg-blue-100 text-blue-800',
  case_opened:           'bg-indigo-100 text-indigo-800',
  inspection_scheduled:  'bg-yellow-100 text-yellow-800',
  inspection_completed:  'bg-orange-100 text-orange-800',
  comparable_analysis:   'bg-purple-100 text-purple-800',
  draft_report:          'bg-violet-100 text-violet-800',
  review:                'bg-amber-100 text-amber-800',
  final_issued:          'bg-teal-100 text-teal-800',
  invoice_sent:          'bg-cyan-100 text-cyan-800',
  payment_received:      'bg-green-100 text-green-800',
  archived:              'bg-gray-100 text-gray-500',
}

interface StageBadgeProps {
  stage: CaseStage
  className?: string
}

export function StageBadge({ stage, className = '' }: StageBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-700'} ${className}`}
    >
      {getCaseStageLabel(stage)}
    </span>
  )
}
