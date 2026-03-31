import { describe, expect, it } from 'vitest'
import { AppError } from '@/lib/api/errors'
import { assertNoBlockingComments, assertReadyForIssue } from './report-compliance'

describe('assertNoBlockingComments', () => {
  it('allows review actions when there are no unresolved blocking comments', () => {
    expect(() => assertNoBlockingComments({ comments: [] }, 'approval')).not.toThrow()
  })

  it('throws a validation error when blocking comments remain', () => {
    expect(() =>
      assertNoBlockingComments({
        comments: [{ id: 'comment-1', body: 'Fix valuation basis.' }],
      }, 'approval')).toThrow(AppError)

    try {
      assertNoBlockingComments({
        comments: [{ id: 'comment-1', body: 'Fix valuation basis.' }],
      }, 'approval')
    } catch (error) {
      const appError = error as AppError
      expect(appError.code).toBe('VALIDATION_ERROR')
      expect(appError.details?.workflow).toEqual(['Resolve all blocking comments before approval.'])
    }
  })
})

describe('assertReadyForIssue', () => {
  it('allows issue when inspection, comparables, and analysis are complete', () => {
    expect(() => assertReadyForIssue({
      case: {
        inspection: { id: 'inspection-1', status: 'submitted' },
        caseComparables: [{ id: 'cc-1' }],
        analysis: { id: 'analysis-1', basisOfValue: 'market_value', concludedValue: '500000000' },
      },
    } as never)).not.toThrow()
  })

  it('returns all blocking readiness reasons when issue prerequisites are missing', () => {
    try {
      assertReadyForIssue({
        case: {
          inspection: null,
          caseComparables: [],
          analysis: { id: 'analysis-1', basisOfValue: '', concludedValue: null },
        },
      } as never)
    } catch (error) {
      const appError = error as AppError
      expect(appError.code).toBe('VALIDATION_ERROR')
      expect(appError.details?.inspection).toEqual(['Inspection must be submitted before issuing the final report.'])
      expect(appError.details?.comparables).toEqual(['Attach at least one comparable before issuing the final report.'])
      expect(appError.details?.basisOfValue).toEqual(['Set the basis of value before issuing the final report.'])
      expect(appError.details?.concludedValue).toEqual(['Set the concluded value before issuing the final report.'])
    }
  })
})
