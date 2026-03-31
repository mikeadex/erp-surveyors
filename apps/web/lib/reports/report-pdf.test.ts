import { describe, expect, it } from 'vitest'
import { buildReportPdfBytes, normalizeReportHtmlForPdf } from './report-pdf'

describe('normalizeReportHtmlForPdf', () => {
  it('drops style blocks and returns readable text', () => {
    const plain = normalizeReportHtmlForPdf(`
      <style>.hidden{display:none}</style>
      <article><h1>Valuation Report</h1><p>Hello <strong>world</strong></p></article>
    `)

    expect(plain).toContain('Valuation Report')
    expect(plain).toContain('Hello world')
    expect(plain).not.toContain('display:none')
  })
})

describe('buildReportPdfBytes', () => {
  it('creates a non-empty pdf payload', async () => {
    const pdf = await buildReportPdfBytes({
      title: 'DMO-2603-1001 Valuation Report',
      subtitle: 'Standard valuation template',
      status: 'draft',
      versionLabel: 'Version 1',
      generatedOn: '31 March 2026, 12:00',
      html: '<article><h1>Summary</h1><p>Weighted indication and reconciliation note.</p></article>',
    })

    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(pdf.byteLength).toBeGreaterThan(800)
  })
})
