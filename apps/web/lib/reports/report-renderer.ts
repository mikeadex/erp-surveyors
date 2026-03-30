import Handlebars from 'handlebars'
import {
  formatCurrency,
  formatDate,
  getCaseStageLabel,
  VALUATION_TYPE_LABELS,
} from '@valuation-os/utils'
import { sanitizeRichTextHtml } from '@/lib/editor/rich-text'

type AssumptionInput = { text?: string | null } | string

type ComparableRowInput = {
  weight: { toString(): string } | null
  relevanceScore: number | null
  adjustmentAmount: { toString(): string } | null
  adjustmentNote: string | null
  comparable: {
    comparableType: string
    address: string
    city: string | null
    state: string | null
    propertyUse: string | null
    transactionDate: Date | null
    salePrice: { toString(): string } | null
    rentalValue: { toString(): string } | null
    pricePerSqm: { toString(): string } | null
    source: string | null
    isVerified: boolean
  }
}

type ReportCaseRecord = {
  reference: string
  valuationType: string
  valuationPurpose: string | null
  stage: string
  dueDate: Date | null
  feeAmount: { toString(): string } | null
  feeCurrency: string
  createdAt: Date
  branch: { name: string } | null
  firm: {
    name: string
    rcNumber: string | null
    esvarNumber: string | null
    address: string | null
    city: string | null
    state: string | null
    phone: string | null
    email: string | null
  }
  client: {
    name: string
    type: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    rcNumber: string | null
    contacts: Array<{
      name: string
      email: string | null
      phone: string | null
      role: string | null
      isPrimary: boolean
    }>
  }
  property: {
    address: string
    city: string
    state: string
    localGovernment: string | null
    propertyUse: string
    tenureType: string
    plotSize: { toString(): string } | null
    plotSizeUnit: string | null
    description: string | null
  }
  assignedValuer: { firstName: string; lastName: string } | null
  assignedReviewer: { firstName: string; lastName: string } | null
  analysis: {
    method: string
    basisOfValue: string
    assumptions: unknown
    specialAssumptions: unknown
    comparableGrid: unknown
    commentary: string | null
    concludedValue: { toString(): string } | null
    valuationDate: Date | null
  } | null
  inspection: {
    inspectionDate: Date | null
    occupancy: string | null
    locationDescription: string | null
    externalCondition: string | null
    internalCondition: string | null
    services: string | null
    conditionSummary: string | null
    notes: string | null
    media: Array<{ id: string }>
    inspector: { firstName: string; lastName: string } | null
  } | null
  caseComparables: ComparableRowInput[]
  invoice: {
    invoiceNumber: string
    totalAmount: { toString(): string }
    currency: string
    status: string
    dueDate: Date | null
  } | null
}

const DEFAULT_REPORT_TEMPLATE = `
<style>
  .vo-report{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#fff}
  .vo-report *{box-sizing:border-box}
  .vo-report__header{display:flex;justify-content:space-between;gap:24px;padding:0 0 24px;border-bottom:1px solid #dbe7df}
  .vo-report__eyebrow,.vo-report__section-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#6f8791;font-weight:700}
  .vo-report__title{font-size:32px;line-height:1.1;margin:10px 0 4px}
  .vo-report__subtitle{margin:0;color:#47606b;font-size:15px}
  .vo-report__meta{min-width:260px;border:1px solid #dbe7df;border-radius:18px;padding:18px;background:#f7fbf8}
  .vo-report__meta-row{display:flex;justify-content:space-between;gap:16px;padding:6px 0;font-size:13px}
  .vo-report__meta-label{color:#6f8791;text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:700}
  .vo-report__meta-value{text-align:right;font-weight:600}
  .vo-report__section{padding:26px 0;border-bottom:1px solid #edf2ef}
  .vo-report__section:last-child{border-bottom:none}
  .vo-report__section-title{margin:8px 0 16px;font-size:22px;line-height:1.2}
  .vo-report__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .vo-report__card{border:1px solid #e5ece8;border-radius:18px;padding:16px;background:#fff}
  .vo-report__card--accent{background:#f4fbf6;border-color:#cce5d4}
  .vo-report__kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6f8791;font-weight:700;margin-bottom:8px}
  .vo-report__value{font-size:28px;font-weight:700;line-height:1.1;margin:0}
  .vo-report__helper{font-size:13px;color:#47606b;margin-top:8px}
  .vo-report__rich{font-size:14px;line-height:1.7;color:#1e293b}
  .vo-report__rich h1,.vo-report__rich h2,.vo-report__rich h3,.vo-report__rich h4{margin:0 0 10px;color:#0f172a}
  .vo-report__rich p{margin:0 0 10px}
  .vo-report__rich ul,.vo-report__rich ol{margin:0 0 12px;padding-left:20px}
  .vo-report__list{margin:0;padding-left:18px;color:#334155}
  .vo-report__list li{margin:6px 0}
  .vo-report__table-wrap{overflow:hidden;border:1px solid #dbe7df;border-radius:18px}
  .vo-report__table{width:100%;border-collapse:collapse;font-size:13px}
  .vo-report__table th{background:#f7fbf8;color:#47606b;text-transform:uppercase;letter-spacing:.16em;font-size:10px;text-align:left;padding:12px 14px}
  .vo-report__table td{padding:12px 14px;border-top:1px solid #edf2ef;vertical-align:top}
  .vo-report__badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;background:#e9f7ee;color:#0b6a38;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .vo-report__muted{color:#64748b}
</style>
<article class="vo-report">
  <header class="vo-report__header">
    <div>
      <div class="vo-report__eyebrow">Valuation Report</div>
      <h1 class="vo-report__title">{{case.reference}}</h1>
      <p class="vo-report__subtitle">{{firm.name}} · {{case.valuationTypeLabel}}</p>
    </div>
    <div class="vo-report__meta">
      <div class="vo-report__meta-row">
        <span class="vo-report__meta-label">Generated</span>
        <span class="vo-report__meta-value">{{report.generatedOn}}</span>
      </div>
      <div class="vo-report__meta-row">
        <span class="vo-report__meta-label">Version</span>
        <span class="vo-report__meta-value">{{report.versionLabel}}</span>
      </div>
      <div class="vo-report__meta-row">
        <span class="vo-report__meta-label">Prepared By</span>
        <span class="vo-report__meta-value">{{case.preparedBy}}</span>
      </div>
      <div class="vo-report__meta-row">
        <span class="vo-report__meta-label">Reviewer</span>
        <span class="vo-report__meta-value">{{case.reviewer}}</span>
      </div>
    </div>
  </header>

  <section class="vo-report__section">
    <div class="vo-report__section-eyebrow">Executive Summary</div>
    <h2 class="vo-report__section-title">Opinion of value and work context</h2>
    <div class="vo-report__grid">
      <div class="vo-report__card vo-report__card--accent">
        <div class="vo-report__kicker">Concluded Value</div>
        <p class="vo-report__value">{{analysis.concludedValue}}</p>
        <p class="vo-report__helper">{{analysis.basisOfValueLabel}} using the {{analysis.methodLabel}} approach.</p>
      </div>
      <div class="vo-report__card">
        <div class="vo-report__kicker">Weighted Indication</div>
        <p class="vo-report__value">{{analysis.weightedAdjustedIndication}}</p>
        <p class="vo-report__helper">Derived from {{analysis.comparableCount}} attached comparables and recorded case adjustments.</p>
      </div>
      <div class="vo-report__card">
        <div class="vo-report__kicker">Client</div>
        <p class="vo-report__value" style="font-size:20px">{{client.name}}</p>
        <p class="vo-report__helper">{{client.typeLabel}} · {{case.valuationPurpose}}</p>
      </div>
      <div class="vo-report__card">
        <div class="vo-report__kicker">Subject Property</div>
        <p class="vo-report__value" style="font-size:20px">{{property.addressLine}}</p>
        <p class="vo-report__helper">{{property.useLabel}} · {{property.tenureLabel}}</p>
      </div>
    </div>
    {{#if analysis.commentaryHtml}}
      <div class="vo-report__rich" style="margin-top:18px">{{{analysis.commentaryHtml}}}</div>
    {{/if}}
  </section>

  <section class="vo-report__section">
    <div class="vo-report__section-eyebrow">Instruction</div>
    <h2 class="vo-report__section-title">Case details</h2>
    <div class="vo-report__grid">
      <div class="vo-report__card">
        <div class="vo-report__kicker">Case</div>
        <p class="vo-report__helper"><strong>Reference:</strong> {{case.reference}}</p>
        <p class="vo-report__helper"><strong>Stage:</strong> {{case.stageLabel}}</p>
        <p class="vo-report__helper"><strong>Branch:</strong> {{case.branchName}}</p>
        <p class="vo-report__helper"><strong>Due Date:</strong> {{case.dueDate}}</p>
      </div>
      <div class="vo-report__card">
        <div class="vo-report__kicker">Client Contact</div>
        <p class="vo-report__helper"><strong>Email:</strong> {{client.email}}</p>
        <p class="vo-report__helper"><strong>Phone:</strong> {{client.phone}}</p>
        <p class="vo-report__helper"><strong>Primary Contact:</strong> {{client.primaryContact}}</p>
        <p class="vo-report__helper"><strong>Address:</strong> {{client.addressLine}}</p>
      </div>
    </div>
  </section>

  <section class="vo-report__section">
    <div class="vo-report__section-eyebrow">Property</div>
    <h2 class="vo-report__section-title">Subject property profile</h2>
    <div class="vo-report__grid">
      <div class="vo-report__card">
        <div class="vo-report__kicker">Location</div>
        <p class="vo-report__helper"><strong>Address:</strong> {{property.addressLine}}</p>
        <p class="vo-report__helper"><strong>City / State:</strong> {{property.cityState}}</p>
        <p class="vo-report__helper"><strong>Local Government:</strong> {{property.localGovernment}}</p>
      </div>
      <div class="vo-report__card">
        <div class="vo-report__kicker">Property Details</div>
        <p class="vo-report__helper"><strong>Use:</strong> {{property.useLabel}}</p>
        <p class="vo-report__helper"><strong>Tenure:</strong> {{property.tenureLabel}}</p>
        <p class="vo-report__helper"><strong>Plot Size:</strong> {{property.plotSize}}</p>
      </div>
    </div>
    {{#if property.descriptionHtml}}
      <div class="vo-report__rich" style="margin-top:18px">{{{property.descriptionHtml}}}</div>
    {{/if}}
  </section>

  <section class="vo-report__section">
    <div class="vo-report__section-eyebrow">Inspection</div>
    <h2 class="vo-report__section-title">Site findings and observation</h2>
    <div class="vo-report__grid">
      <div class="vo-report__card">
        <div class="vo-report__kicker">Field Summary</div>
        <p class="vo-report__helper"><strong>Inspection Date:</strong> {{inspection.inspectionDate}}</p>
        <p class="vo-report__helper"><strong>Inspected By:</strong> {{inspection.inspectorName}}</p>
        <p class="vo-report__helper"><strong>Occupancy:</strong> {{inspection.occupancy}}</p>
        <p class="vo-report__helper"><strong>Photo Register:</strong> {{inspection.photoCount}}</p>
      </div>
      <div class="vo-report__card">
        <div class="vo-report__kicker">Condition Signals</div>
        <p class="vo-report__helper"><strong>External:</strong> {{inspection.externalConditionText}}</p>
        <p class="vo-report__helper"><strong>Internal:</strong> {{inspection.internalConditionText}}</p>
        <p class="vo-report__helper"><strong>Services:</strong> {{inspection.servicesText}}</p>
      </div>
    </div>
    {{#if inspection.locationHtml}}
      <div class="vo-report__rich" style="margin-top:18px">
        <h3>Location Context</h3>
        {{{inspection.locationHtml}}}
      </div>
    {{/if}}
    {{#if inspection.summaryHtml}}
      <div class="vo-report__rich" style="margin-top:18px">
        <h3>Condition Summary</h3>
        {{{inspection.summaryHtml}}}
      </div>
    {{/if}}
    {{#if inspection.notesHtml}}
      <div class="vo-report__rich" style="margin-top:18px">
        <h3>Inspector Notes</h3>
        {{{inspection.notesHtml}}}
      </div>
    {{/if}}
  </section>

  <section class="vo-report__section">
    <div class="vo-report__section-eyebrow">Analysis</div>
    <h2 class="vo-report__section-title">Methodology and assumptions</h2>
    <div class="vo-report__grid">
      <div class="vo-report__card">
        <div class="vo-report__kicker">Analysis Basis</div>
        <p class="vo-report__helper"><strong>Method:</strong> {{analysis.methodLabel}}</p>
        <p class="vo-report__helper"><strong>Basis:</strong> {{analysis.basisOfValueLabel}}</p>
        <p class="vo-report__helper"><strong>Valuation Date:</strong> {{analysis.valuationDate}}</p>
        <p class="vo-report__helper"><strong>Average Relevance:</strong> {{analysis.averageRelevance}}</p>
      </div>
      <div class="vo-report__card">
        <div class="vo-report__kicker">Market Signals</div>
        <p class="vo-report__helper"><strong>Weighted Rate:</strong> {{analysis.weightedAverageRate}}</p>
        <p class="vo-report__helper"><strong>Weighted Indication:</strong> {{analysis.weightedAdjustedIndication}}</p>
      </div>
    </div>
    {{#if analysis.assumptions.length}}
      <div style="margin-top:18px">
        <div class="vo-report__kicker">Assumptions</div>
        <ul class="vo-report__list">
          {{#each analysis.assumptions}}
            <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
    {{/if}}
    {{#if analysis.specialAssumptions.length}}
      <div style="margin-top:18px">
        <div class="vo-report__kicker">Special Assumptions</div>
        <ul class="vo-report__list">
          {{#each analysis.specialAssumptions}}
            <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
    {{/if}}
  </section>

  <section class="vo-report__section">
    <div class="vo-report__section-eyebrow">Comparable Evidence</div>
    <h2 class="vo-report__section-title">Market evidence applied to this case</h2>
    <div class="vo-report__table-wrap">
      <table class="vo-report__table">
        <thead>
          <tr>
            <th>Comparable</th>
            <th>Type</th>
            <th>Value</th>
            <th>Rate</th>
            <th>Relevance</th>
            <th>Adjustment</th>
            <th>Adjusted</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {{#each comparables}}
            <tr>
              <td>
                <strong>{{address}}</strong><br />
                <span class="vo-report__muted">{{cityState}}</span>
                {{#if isVerified}}<div style="margin-top:6px"><span class="vo-report__badge">Verified</span></div>{{/if}}
              </td>
              <td>{{typeLabel}}</td>
              <td>{{value}}</td>
              <td>{{rate}}</td>
              <td>{{relevance}}</td>
              <td>{{adjustment}}</td>
              <td>{{adjustedValue}}</td>
              <td>{{weight}}</td>
            </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
  </section>

  {{#if disclaimers.length}}
    <section class="vo-report__section">
      <div class="vo-report__section-eyebrow">Disclaimers</div>
      <h2 class="vo-report__section-title">Important limitations</h2>
      <ul class="vo-report__list">
        {{#each disclaimers}}
          <li>{{this}}</li>
        {{/each}}
      </ul>
    </section>
  {{/if}}
</article>
`

type RenderReportDraftArgs = {
  caseRecord: ReportCaseRecord
  version: number
  templateName?: string | null
  templateHtml?: string | null
  templateDefaultDisclaimers?: unknown
}

function decimalLike(value: string) {
  return { toString: () => value }
}

function labelize(value: string | null | undefined) {
  if (!value) return '—'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function parseAmount(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return null
  const raw = typeof value === 'number' ? value : Number(value.toString())
  return Number.isFinite(raw) ? raw : null
}

function coerceAssumptions(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]

  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'text' in item) {
        return String((item as AssumptionInput & { text?: string }).text ?? '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function joinAddress(parts: Array<string | null | undefined>) {
  const filtered = parts.map((item) => item?.trim()).filter(Boolean)
  return filtered.length > 0 ? filtered.join(', ') : '—'
}

function extractComparableSummary(comparableGrid: unknown) {
  if (!comparableGrid || typeof comparableGrid !== 'object') {
    return {
      weightedAdjustedIndication: null as number | null,
      weightedAverageRate: null as number | null,
      averageRelevance: null as number | null,
    }
  }

  const summary =
    'summary' in comparableGrid && comparableGrid.summary && typeof comparableGrid.summary === 'object'
      ? comparableGrid.summary as Record<string, unknown>
      : {}

  const toNumber = (value: unknown) =>
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : null

  return {
    weightedAdjustedIndication: toNumber(summary.weightedAdjustedIndication),
    weightedAverageRate: toNumber(summary.weightedAverageRate),
    averageRelevance: toNumber(summary.averageRelevance),
  }
}

function buildComparableRows(caseComparables: ComparableRowInput[]) {
  return caseComparables.map(({ comparable, weight, relevanceScore, adjustmentAmount }) => {
    const rawValue = comparable.salePrice ?? comparable.rentalValue
    const rawValueNumber = parseAmount(rawValue)
    const adjustmentNumber = parseAmount(adjustmentAmount) ?? 0
    const adjustedNumber = rawValueNumber === null ? null : rawValueNumber + adjustmentNumber

    return {
      address: comparable.address,
      cityState: joinAddress([comparable.city, comparable.state]),
      typeLabel: labelize(comparable.comparableType),
      value: rawValueNumber === null ? '—' : formatCurrency(rawValueNumber),
      rate:
        comparable.pricePerSqm === null
          ? '—'
          : `${formatCurrency(comparable.pricePerSqm.toString())}/sqm`,
      relevance: relevanceScore ? `${relevanceScore}/5` : '—',
      adjustment:
        adjustmentAmount === null
          ? '—'
          : formatCurrency(adjustmentAmount.toString()),
      adjustedValue: adjustedNumber === null ? '—' : formatCurrency(adjustedNumber),
      weight: weight ? `${weight.toString()}%` : '—',
      isVerified: comparable.isVerified,
    }
  })
}

function fullName(person: { firstName: string; lastName: string } | null | undefined) {
  if (!person) return '—'
  return `${person.firstName} ${person.lastName}`.trim()
}

export function renderReportDraft({
  caseRecord,
  version,
  templateName,
  templateHtml,
  templateDefaultDisclaimers,
}: RenderReportDraftArgs) {
  const comparableSummary = extractComparableSummary(caseRecord.analysis?.comparableGrid)
  const comparables = buildComparableRows(caseRecord.caseComparables)
  const primaryContact = caseRecord.client.contacts.find((contact) => contact.isPrimary) ?? caseRecord.client.contacts[0]
  const assumptions = coerceAssumptions(caseRecord.analysis?.assumptions)
  const specialAssumptions = coerceAssumptions(caseRecord.analysis?.specialAssumptions)
  const disclaimers = coerceAssumptions(templateDefaultDisclaimers)

  const context = {
    report: {
      generatedOn: formatDate(new Date(), {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      versionLabel: `Version ${version}`,
      templateName: templateName ?? 'Standard valuation report',
    },
    firm: {
      name: caseRecord.firm.name,
      rcNumber: caseRecord.firm.rcNumber ?? '—',
      esvarNumber: caseRecord.firm.esvarNumber ?? '—',
      addressLine: joinAddress([
        caseRecord.firm.address,
        caseRecord.firm.city,
        caseRecord.firm.state,
      ]),
      phone: caseRecord.firm.phone ?? '—',
      email: caseRecord.firm.email ?? '—',
    },
    case: {
      reference: caseRecord.reference,
      valuationTypeLabel:
        VALUATION_TYPE_LABELS[caseRecord.valuationType as keyof typeof VALUATION_TYPE_LABELS] ??
        labelize(caseRecord.valuationType),
      valuationPurpose: caseRecord.valuationPurpose ?? 'General valuation instruction',
      stageLabel: getCaseStageLabel(caseRecord.stage as never),
      dueDate: caseRecord.dueDate ? formatDate(caseRecord.dueDate) : '—',
      branchName: caseRecord.branch?.name ?? 'Firm-wide',
      preparedBy: fullName(caseRecord.assignedValuer),
      reviewer: fullName(caseRecord.assignedReviewer),
      feeAmount: caseRecord.feeAmount
        ? formatCurrency(caseRecord.feeAmount.toString(), caseRecord.feeCurrency)
        : '—',
      createdOn: formatDate(caseRecord.createdAt),
    },
    client: {
      name: caseRecord.client.name,
      typeLabel: labelize(caseRecord.client.type),
      email: primaryContact?.email ?? caseRecord.client.email ?? '—',
      phone: primaryContact?.phone ?? caseRecord.client.phone ?? '—',
      primaryContact: primaryContact
        ? `${primaryContact.name}${primaryContact.role ? ` (${primaryContact.role})` : ''}`
        : '—',
      addressLine: joinAddress([
        caseRecord.client.address,
        caseRecord.client.city,
        caseRecord.client.state,
      ]),
      rcNumber: caseRecord.client.rcNumber ?? '—',
    },
    property: {
      addressLine: caseRecord.property.address,
      cityState: joinAddress([caseRecord.property.city, caseRecord.property.state]),
      localGovernment: caseRecord.property.localGovernment ?? '—',
      useLabel: labelize(caseRecord.property.propertyUse),
      tenureLabel: labelize(caseRecord.property.tenureType),
      plotSize: caseRecord.property.plotSize
        ? `${caseRecord.property.plotSize.toString()} ${caseRecord.property.plotSizeUnit ?? 'sqm'}`
        : '—',
      descriptionHtml: sanitizeRichTextHtml(caseRecord.property.description),
    },
    inspection: {
      inspectionDate: caseRecord.inspection?.inspectionDate
        ? formatDate(caseRecord.inspection.inspectionDate)
        : '—',
      occupancy: caseRecord.inspection?.occupancy ?? '—',
      inspectorName: fullName(caseRecord.inspection?.inspector),
      photoCount: `${caseRecord.inspection?.media.length ?? 0} photo${(caseRecord.inspection?.media.length ?? 0) === 1 ? '' : 's'}`,
      externalConditionText: caseRecord.inspection?.externalCondition
        ? labelize(caseRecord.inspection.externalCondition)
        : '—',
      internalConditionText: caseRecord.inspection?.internalCondition
        ? labelize(caseRecord.inspection.internalCondition)
        : '—',
      servicesText: caseRecord.inspection?.services
        ? labelize(caseRecord.inspection.services)
        : '—',
      locationHtml: sanitizeRichTextHtml(caseRecord.inspection?.locationDescription),
      summaryHtml: sanitizeRichTextHtml(caseRecord.inspection?.conditionSummary),
      notesHtml: sanitizeRichTextHtml(caseRecord.inspection?.notes),
    },
    analysis: {
      methodLabel: caseRecord.analysis ? labelize(caseRecord.analysis.method) : '—',
      basisOfValueLabel: caseRecord.analysis ? labelize(caseRecord.analysis.basisOfValue) : '—',
      valuationDate: caseRecord.analysis?.valuationDate
        ? formatDate(caseRecord.analysis.valuationDate)
        : '—',
      concludedValue: caseRecord.analysis?.concludedValue
        ? formatCurrency(caseRecord.analysis.concludedValue.toString())
        : '—',
      weightedAdjustedIndication:
        comparableSummary.weightedAdjustedIndication === null
          ? '—'
          : formatCurrency(comparableSummary.weightedAdjustedIndication),
      weightedAverageRate:
        comparableSummary.weightedAverageRate === null
          ? '—'
          : `${formatCurrency(comparableSummary.weightedAverageRate)}/sqm`,
      averageRelevance:
        comparableSummary.averageRelevance === null
          ? '—'
          : `${comparableSummary.averageRelevance.toFixed(1)}/5`,
      comparableCount: comparables.length,
      assumptions,
      specialAssumptions,
      commentaryHtml: sanitizeRichTextHtml(caseRecord.analysis?.commentary),
    },
    comparables,
    invoice: caseRecord.invoice
      ? {
          invoiceNumber: caseRecord.invoice.invoiceNumber,
          totalAmount: formatCurrency(
            caseRecord.invoice.totalAmount.toString(),
            caseRecord.invoice.currency,
          ),
          status: labelize(caseRecord.invoice.status),
          dueDate: caseRecord.invoice.dueDate ? formatDate(caseRecord.invoice.dueDate) : '—',
        }
      : null,
    disclaimers,
  }

  const handlebars = Handlebars.create()
  const compiled = handlebars.compile(templateHtml?.trim() || DEFAULT_REPORT_TEMPLATE)
  return compiled(context)
}

export function getDefaultReportTemplateHtml() {
  return DEFAULT_REPORT_TEMPLATE
}

export function renderReportTemplatePreview({
  templateName,
  valuationType,
  templateHtml,
  templateDefaultDisclaimers,
}: {
  templateName?: string | null
  valuationType?: string | null
  templateHtml?: string | null
  templateDefaultDisclaimers?: unknown
}) {
  const previewCaseRecord: ReportCaseRecord = {
    reference: 'VO-REP-202603-0012',
    valuationType: valuationType ?? 'market',
    valuationPurpose: 'Secured lending decision support',
    stage: 'review',
    dueDate: new Date('2026-04-04T09:00:00.000Z'),
    feeAmount: decimalLike('450000'),
    feeCurrency: 'NGN',
    createdAt: new Date('2026-03-28T08:30:00.000Z'),
    branch: { name: 'Lekki Branch' },
    firm: {
      name: 'Taiwo & Co',
      rcNumber: 'RC-102938',
      esvarNumber: 'ESVAR-7742',
      address: '12 Admiralty Way',
      city: 'Lagos',
      state: 'Lagos',
      phone: '+234 800 000 0000',
      email: 'hello@taiwoandco.com',
    },
    client: {
      name: 'Paradigm Shift Multimedia',
      type: 'corporate',
      email: 'client@paradigmshift.com',
      phone: '+234 803 111 2222',
      address: '23 Wharf Road',
      city: 'Lagos',
      state: 'Lagos',
      rcNumber: 'RC-558811',
      contacts: [
        {
          name: 'Michael Olusegun Adeleye',
          email: 'michael@paradigmshift.com',
          phone: '+234 803 111 2222',
          role: 'Director',
          isPrimary: true,
        },
      ],
    },
    property: {
      address: '23 Wharf Road, Lekki Phase 1',
      city: 'Lagos',
      state: 'Lagos',
      localGovernment: 'Eti-Osa',
      propertyUse: 'commercial',
      tenureType: 'leasehold',
      plotSize: decimalLike('1250'),
      plotSizeUnit: 'sqm',
      description:
        '<p>A modern mixed-use office building with supporting parking, good arterial access, and strong surrounding commercial demand.</p>',
    },
    assignedValuer: { firstName: 'Michaela', lastName: 'Adeleye' },
    assignedReviewer: { firstName: 'Amina', lastName: 'Bello' },
    analysis: {
      method: 'sales_comparison',
      basisOfValue: 'market_value',
      assumptions: [
        { text: 'Title information supplied is valid and marketable.' },
        { text: 'The property is free from material latent defects not observed during inspection.' },
      ],
      specialAssumptions: [
        { text: 'The tenancy schedule presented by management is substantially correct.' },
      ],
      comparableGrid: {
        summary: {
          weightedAdjustedIndication: 265000000,
          weightedAverageRate: 212000,
          averageRelevance: 4.2,
        },
      },
      commentary:
        '<p>The concluded value moderately exceeds the weighted indication because the subject enjoys stronger frontage, better parking, and more reliable covenant quality than the lower-ranked evidence.</p>',
      concludedValue: decimalLike('270000000'),
      valuationDate: new Date('2026-03-29T00:00:00.000Z'),
    },
    inspection: {
      inspectionDate: new Date('2026-03-27T12:00:00.000Z'),
      occupancy: 'Owner occupied',
      locationDescription:
        '<p>The property sits within an established commercial corridor with strong vehicular visibility and close proximity to supporting retail and office demand.</p>',
      externalCondition: 'good',
      internalCondition: 'good',
      services: 'fully_serviced',
      conditionSummary:
        '<p>General condition is good, with only light cosmetic wear observed at the time of inspection.</p>',
      notes:
        '<p>No obvious structural distress was observed. Services appeared functional during the inspection walk-through.</p>',
      media: [{ id: 'preview-photo-1' }, { id: 'preview-photo-2' }],
      inspector: { firstName: 'Tolu', lastName: 'Akin' },
    },
    caseComparables: [
      {
        weight: decimalLike('45'),
        relevanceScore: 5,
        adjustmentAmount: decimalLike('-5000000'),
        adjustmentNote: 'Inferior frontage and weaker parking provision.',
        comparable: {
          comparableType: 'sales',
          address: '15 Admiralty Way',
          city: 'Lagos',
          state: 'Lagos',
          propertyUse: 'commercial',
          transactionDate: new Date('2026-02-14T00:00:00.000Z'),
          salePrice: decimalLike('260000000'),
          rentalValue: null,
          pricePerSqm: decimalLike('208000'),
          source: 'Registered transaction',
          isVerified: true,
        },
      },
      {
        weight: decimalLike('35'),
        relevanceScore: 4,
        adjustmentAmount: decimalLike('8000000'),
        adjustmentNote: 'Subject has superior fit-out and more efficient floor plate.',
        comparable: {
          comparableType: 'sales',
          address: '7 Freedom Way',
          city: 'Lagos',
          state: 'Lagos',
          propertyUse: 'commercial',
          transactionDate: new Date('2026-01-09T00:00:00.000Z'),
          salePrice: decimalLike('248000000'),
          rentalValue: null,
          pricePerSqm: decimalLike('198000'),
          source: 'Broker verification',
          isVerified: true,
        },
      },
      {
        weight: decimalLike('20'),
        relevanceScore: 3,
        adjustmentAmount: decimalLike('12000000'),
        adjustmentNote: 'Older building stock with lower occupancy resilience.',
        comparable: {
          comparableType: 'rental',
          address: '3A Fola Osibo Road',
          city: 'Lagos',
          state: 'Lagos',
          propertyUse: 'commercial',
          transactionDate: new Date('2025-12-18T00:00:00.000Z'),
          salePrice: null,
          rentalValue: decimalLike('36000000'),
          pricePerSqm: decimalLike('195000'),
          source: 'Tenant schedule and market check',
          isVerified: false,
        },
      },
    ],
    invoice: {
      invoiceNumber: 'INV-2026-0042',
      totalAmount: decimalLike('517500'),
      currency: 'NGN',
      status: 'sent',
      dueDate: new Date('2026-04-07T00:00:00.000Z'),
    },
  }

  return renderReportDraft({
    caseRecord: previewCaseRecord,
    version: 3,
    templateName: templateName ?? null,
    templateHtml: templateHtml ?? null,
    templateDefaultDisclaimers,
  })
}
