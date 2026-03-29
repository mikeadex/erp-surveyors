export const PAGINATION_DEFAULT_PAGE_SIZE = 25
export const PAGINATION_MAX_PAGE_SIZE = 100

export const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const

export const TENURE_TYPES = [
  { value: 'statutory_right_of_occupancy', label: 'Statutory Right of Occupancy' },
  { value: 'customary_right_of_occupancy', label: 'Customary Right of Occupancy' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'freehold', label: 'Freehold' },
  { value: 'government_allocation', label: 'Government Allocation' },
  { value: 'other', label: 'Other' },
] as const

export const PROPERTY_USES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
] as const

export const VALUATION_METHODS = [
  { value: 'sales_comparison', label: 'Sales Comparison' },
  { value: 'income_capitalisation', label: 'Income Capitalisation' },
  { value: 'discounted_cash_flow', label: 'Discounted Cash Flow' },
  { value: 'cost', label: 'Cost Approach' },
  { value: 'profits', label: 'Profits Method' },
  { value: 'residual', label: 'Residual Method' },
] as const

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic']
