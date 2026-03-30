import { z } from 'zod'

const trimmedOptionalString = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined)

const TenureTypeSchema = z.enum([
  'statutory_right_of_occupancy',
  'customary_right_of_occupancy',
  'leasehold',
  'freehold',
  'government_allocation',
  'other',
])

const PropertyUseSchema = z.enum([
  'residential',
  'commercial',
  'industrial',
  'agricultural',
  'mixed_use',
  'land',
])

export const CreatePropertySchema = z.object({
  address: z.string().trim().min(1).max(400),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  localGovernment: trimmedOptionalString(100),
  propertyUse: PropertyUseSchema,
  tenureType: TenureTypeSchema,
  plotSize: z.number().positive().optional(),
  plotSizeUnit: z.enum(['sqm', 'sqft', 'hectare', 'acres']).optional(),
  description: trimmedOptionalString(4000),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

export const UpdatePropertySchema = CreatePropertySchema.partial()

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>
