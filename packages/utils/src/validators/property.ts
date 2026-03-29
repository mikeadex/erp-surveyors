import { z } from 'zod'

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
  address: z.string().min(1).max(400),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  localGovernment: z.string().max(100).optional(),
  propertyUse: PropertyUseSchema,
  tenureType: TenureTypeSchema,
  plotSize: z.number().positive().optional(),
  plotSizeUnit: z.string().max(20).optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export const UpdatePropertySchema = CreatePropertySchema.partial()

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>
