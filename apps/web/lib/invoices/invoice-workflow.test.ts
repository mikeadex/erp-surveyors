import { describe, expect, it } from 'vitest'
import { calculateInvoiceTotals } from './invoice-workflow'

describe('calculateInvoiceTotals', () => {
  it('returns total equal to amount when tax rate is not provided', () => {
    expect(calculateInvoiceTotals(250000)).toEqual({
      taxAmount: 0,
      totalAmount: 250000,
    })
  })

  it('calculates tax and total when tax rate is present', () => {
    expect(calculateInvoiceTotals(100000, 0.075)).toEqual({
      taxAmount: 7500,
      totalAmount: 107500,
    })
  })
})
