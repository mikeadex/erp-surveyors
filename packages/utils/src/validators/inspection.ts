import { z } from 'zod'

export const CreateInspectionSchema = z.object({
  inspectionDate: z.coerce.date().optional(),
  occupancy: z.string().max(100).optional(),
  locationDescription: z.string().optional(),
  externalCondition: z.string().optional(),
  internalCondition: z.string().optional(),
  services: z.string().optional(),
  conditionSummary: z.string().optional(),
  notes: z.string().optional(),
  offlineDraft: z.record(z.unknown()).optional(),
})

export const SubmitInspectionSchema = z.object({
  notes: z.string().optional(),
  findings: z.record(z.unknown()).optional(),
  offlineDraft: z.record(z.unknown()).optional(),
})

export type CreateInspectionInput = z.infer<typeof CreateInspectionSchema>
export type SubmitInspectionInput = z.infer<typeof SubmitInspectionSchema>
