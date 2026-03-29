import { z } from 'zod'

export const CreateComparableSchema = z.object({
  comparableType: z.enum(['sales', 'rental', 'land']),
  address: z.string().min(5).max(400),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  propertyUse: z.string().max(60).optional(),
  tenureType: z.string().max(60).optional(),
  transactionDate: z.string().datetime().optional(),
  salePrice: z.number().positive().optional(),
  rentalValue: z.number().positive().optional(),
  plotSize: z.number().positive().optional(),
  plotSizeUnit: z.enum(['sqm', 'hectare', 'acres']).optional(),
  buildingSize: z.number().positive().optional(),
  buildingSizeUnit: z.enum(['sqm', 'sqft']).optional(),
  source: z.string().max(200).optional(),
  sourceContact: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
})

export const UpdateComparableSchema = CreateComparableSchema.partial().extend({
  isVerified: z.boolean().optional(),
})

export const LinkComparableSchema = z.object({
  comparableId: z.string().uuid(),
  weight: z.number().min(0).max(100).optional(),
})

export type CreateComparableInput = z.infer<typeof CreateComparableSchema>
export type UpdateComparableInput = z.infer<typeof UpdateComparableSchema>
export type LinkComparableInput = z.infer<typeof LinkComparableSchema>
