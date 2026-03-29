import { z } from 'zod'

export const CreateInspectionSchema = z.object({
  inspectionDate: z.coerce.date().optional(),
  address: z.string().min(1).max(400).optional(),
  notes: z.string().optional(),
})

export const SubmitInspectionSchema = z.object({
  notes: z.string().optional(),
  findings: z.record(z.unknown()).optional(),
  offlineDraft: z.record(z.unknown()).optional(),
})

export type CreateInspectionInput = z.infer<typeof CreateInspectionSchema>
export type SubmitInspectionInput = z.infer<typeof SubmitInspectionSchema>
