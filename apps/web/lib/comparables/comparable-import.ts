import { CreateComparableSchema, type CreateComparableInput } from '@valuation-os/utils'

export const COMPARABLE_IMPORT_HEADERS = [
  'comparableType',
  'address',
  'city',
  'state',
  'propertyUse',
  'tenureType',
  'transactionDate',
  'salePrice',
  'rentalValue',
  'plotSize',
  'plotSizeUnit',
  'buildingSize',
  'buildingSizeUnit',
  'source',
  'sourceContact',
  'notes',
  'isVerified',
] as const

export type ComparableImportError = {
  row: number
  error: string
}

type ParsedComparableRow = {
  input: CreateComparableInput
  isVerified?: boolean
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/^"|"$/g, '').replace(/\s+/g, '').toLowerCase()
}

function normalizeValue(value: string | undefined): string | undefined {
  const normalized = (value ?? '').trim()
  return normalized.length > 0 ? normalized : undefined
}

function parseNumber(value: string | undefined): number | undefined {
  const normalized = normalizeValue(value)
  if (!normalized) return undefined

  const numeric = Number(normalized.replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : Number.NaN
}

function parseBoolean(value: string | undefined): boolean | undefined {
  const normalized = normalizeValue(value)?.toLowerCase()
  if (!normalized) return undefined
  if (['true', 'yes', '1', 'verified'].includes(normalized)) return true
  if (['false', 'no', '0', 'unverified'].includes(normalized)) return false
  return undefined
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

export function parseCsvText(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? ''
      return acc
    }, {})
  })
}

export function parseComparableImportRow(
  row: Record<string, string>,
  rowNumber: number,
): ParsedComparableRow {
  const salePrice = parseNumber(row.saleprice)
  const rentalValue = parseNumber(row.rentalvalue)
  const plotSize = parseNumber(row.plotsize)
  const buildingSize = parseNumber(row.buildingsize)

  const parsed = CreateComparableSchema.safeParse({
    comparableType: normalizeValue(row.comparabletype),
    address: normalizeValue(row.address),
    city: normalizeValue(row.city),
    state: normalizeValue(row.state),
    propertyUse: normalizeValue(row.propertyuse),
    tenureType: normalizeValue(row.tenuretype),
    transactionDate: normalizeValue(row.transactiondate),
    salePrice,
    rentalValue,
    plotSize,
    plotSizeUnit: normalizeValue(row.plotsizeunit),
    buildingSize,
    buildingSizeUnit: normalizeValue(row.buildingsizeunit),
    source: normalizeValue(row.source),
    sourceContact: normalizeValue(row.sourcecontact),
    notes: normalizeValue(row.notes),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '))
  }

  if (salePrice !== undefined && Number.isNaN(salePrice)) {
    throw new Error(`Row ${rowNumber}: salePrice must be a number`)
  }

  if (rentalValue !== undefined && Number.isNaN(rentalValue)) {
    throw new Error(`Row ${rowNumber}: rentalValue must be a number`)
  }

  if (plotSize !== undefined && Number.isNaN(plotSize)) {
    throw new Error(`Row ${rowNumber}: plotSize must be a number`)
  }

  if (buildingSize !== undefined && Number.isNaN(buildingSize)) {
    throw new Error(`Row ${rowNumber}: buildingSize must be a number`)
  }

  const isVerified = parseBoolean(row.isverified)

  return {
    input: parsed.data,
    ...(typeof isVerified === 'boolean' ? { isVerified } : {}),
  }
}

export function buildComparableImportTemplate(): string {
  return `${COMPARABLE_IMPORT_HEADERS.join(',')}\n` +
    'sales,"5 Kofo Abayomi Street",Lagos,Lagos,residential,leasehold,2025-11-01,85000000,,400,sqm,250,sqm,Field survey,Agent A,"Verified by firm agent",true\n' +
    'rental,"12 Ozumba Mbadiwe Avenue",Lagos,Lagos,commercial,,2025-10-14,,4500000,,,180,sqm,Agent referral,Source desk,"Annual rental evidence",false\n'
}
