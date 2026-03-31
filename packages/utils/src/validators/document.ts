import { z } from 'zod'

const trimmedOptionalString = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined)

const optionalUuid = z.string().uuid().optional().nullable().transform((value) => value || undefined)

const TagsSchema = z.array(z.string().trim().min(1).max(50)).max(20).optional()

export const CreateDocumentSchema = z.object({
  caseId: optionalUuid,
  clientId: optionalUuid,
  propertyId: optionalUuid,
  name: z.string().trim().min(1).max(300),
  category: trimmedOptionalString(80),
  tags: TagsSchema,
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
}).superRefine((value, ctx) => {
  if (!value.caseId && !value.clientId && !value.propertyId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['caseId'],
      message: 'Link the document to a case, client, or property.',
    })
  }
})

export const UpdateDocumentSchema = z.object({
  caseId: optionalUuid,
  clientId: optionalUuid,
  propertyId: optionalUuid,
  name: z.string().trim().min(1).max(300).optional(),
  category: trimmedOptionalString(80),
  tags: TagsSchema,
}).superRefine((value, ctx) => {
  if (
    value.caseId !== undefined
    && value.clientId !== undefined
    && value.propertyId !== undefined
    && !value.caseId
    && !value.clientId
    && !value.propertyId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['caseId'],
      message: 'Keep the document linked to at least one case, client, or property.',
    })
  }
})

export const ConfirmDocumentUploadSchema = z.object({
  documentId: z.string().uuid(),
})

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>
export type ConfirmDocumentUploadInput = z.infer<typeof ConfirmDocumentUploadSchema>
