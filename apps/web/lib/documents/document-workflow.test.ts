import { describe, expect, it, vi } from 'vitest'
import { buildDocumentStorageKey, buildDocumentVisibilityWhere, inferDocumentExtension } from './document-workflow'

describe('inferDocumentExtension', () => {
  it('prefers the explicit extension from the provided file name', () => {
    expect(inferDocumentExtension('signed-instruction.docx', 'application/pdf')).toBe('docx')
  })

  it('falls back to mime-type mapping when the file name has no extension', () => {
    expect(inferDocumentExtension('title deed', 'application/pdf')).toBe('pdf')
  })
})

describe('buildDocumentVisibilityWhere', () => {
  it('returns no extra scope when branch is unrestricted', () => {
    expect(buildDocumentVisibilityWhere()).toBeUndefined()
  })

  it('builds branch-aware visibility clauses when a branch scope exists', () => {
    expect(buildDocumentVisibilityWhere('branch-1')).toEqual({
      OR: [
        { case: { branchId: 'branch-1' } },
        { client: { branchId: 'branch-1' } },
        {
          AND: [
            { caseId: null },
            { clientId: null },
          ],
        },
      ],
    })
  })
})

describe('buildDocumentStorageKey', () => {
  it('builds a stable storage path prefix for the firm and month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T10:15:00.000Z'))
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-1234')

    const key = buildDocumentStorageKey({
      firmId: 'firm-1',
      fileName: 'Inspection Memo.pdf',
      mimeType: 'application/pdf',
    })

    expect(key).toContain('documents/firm-1/2026/03/')
    expect(key).toContain('-inspection-memo-uuid-1234.pdf')

    uuidSpy.mockRestore()
    vi.useRealTimers()
  })
})
