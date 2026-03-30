import { z } from 'zod'

const ValuationTypeSchema = z.enum([
  'market', 'rental', 'mortgage', 'insurance', 'probate', 'commercial', 'land',
])

const DateTimeStringSchema = z.string().refine((value) => {
  if (!value) return false

  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime())
}, 'Enter a valid date and time')

export const CreateCaseSchema = z.object({
  clientId: z.string().uuid(),
  propertyId: z.string().uuid(),
  valuationType: ValuationTypeSchema,
  valuationPurpose: z.string().max(200).optional(),
  assignedValuerId: z.string().uuid(),
  assignedReviewerId: z.string().uuid().optional(),
  dueDate: DateTimeStringSchema.optional(),
  feeAmount: z.number().positive().optional(),
  internalNotes: z.string().max(2000).optional(),
  branchId: z.string().uuid().optional(),
})

export const UpdateCaseSchema = z.object({
  valuationPurpose: z.string().max(200).optional(),
  assignedValuerId: z.string().uuid().optional(),
  assignedReviewerId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  dueDate: DateTimeStringSchema.nullable().optional(),
  feeAmount: z.number().positive().nullable().optional(),
  internalNotes: z.string().max(2000).optional(),
})

export const AdvanceCaseStageSchema = z.object({
  stage: z.enum([
    'enquiry_received', 'quote_issued', 'instruction_accepted', 'case_opened',
    'inspection_scheduled', 'inspection_completed', 'comparable_analysis',
    'draft_report', 'review', 'final_issued', 'invoice_sent',
    'payment_received', 'archived',
  ]),
})

export type CreateCaseInput = z.infer<typeof CreateCaseSchema>
export type UpdateCaseInput = z.infer<typeof UpdateCaseSchema>
export type AdvanceCaseStageInput = z.infer<typeof AdvanceCaseStageSchema>
