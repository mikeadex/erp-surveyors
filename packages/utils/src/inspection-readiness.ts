export interface InspectionSubmissionReadinessInput {
  inspectionDate?: string | Date | null
  occupancy?: string | null
  locationDescription?: string | null
  externalCondition?: string | null
  internalCondition?: string | null
  services?: string | null
  conditionSummary?: string | null
  mediaCount?: number | null
}

export interface InspectionSubmissionIssue {
  key:
    | 'inspectionDate'
    | 'occupancy'
    | 'locationDescription'
    | 'externalCondition'
    | 'internalCondition'
    | 'services'
    | 'conditionSummary'
    | 'media'
  label: string
  message: string
}

function plainTextValue(value: string | null | undefined) {
  if (!value) return ''

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|ul|ol|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function getInspectionSubmissionIssues(
  input: InspectionSubmissionReadinessInput,
): InspectionSubmissionIssue[] {
  const issues: InspectionSubmissionIssue[] = []

  if (!input.inspectionDate) {
    issues.push({
      key: 'inspectionDate',
      label: 'Inspection date',
      message: 'Set the inspection date before submitting.',
    })
  }

  if (!plainTextValue(input.occupancy)) {
    issues.push({
      key: 'occupancy',
      label: 'Occupancy status',
      message: 'Capture the occupancy status before submitting.',
    })
  }

  if (!plainTextValue(input.locationDescription)) {
    issues.push({
      key: 'locationDescription',
      label: 'Location description',
      message: 'Add location context and site access notes before submitting.',
    })
  }

  if (!plainTextValue(input.externalCondition)) {
    issues.push({
      key: 'externalCondition',
      label: 'External condition',
      message: 'Describe the external condition before submitting.',
    })
  }

  if (!plainTextValue(input.internalCondition)) {
    issues.push({
      key: 'internalCondition',
      label: 'Internal condition',
      message: 'Describe the internal condition before submitting.',
    })
  }

  if (!plainTextValue(input.services)) {
    issues.push({
      key: 'services',
      label: 'Services and utilities',
      message: 'Document the services and utilities before submitting.',
    })
  }

  if (!plainTextValue(input.conditionSummary)) {
    issues.push({
      key: 'conditionSummary',
      label: 'Condition summary',
      message: 'Add a clear inspection summary before submitting.',
    })
  }

  if ((input.mediaCount ?? 0) < 1) {
    issues.push({
      key: 'media',
      label: 'Photo register',
      message: 'Attach at least one inspection photo before submitting.',
    })
  }

  return issues
}
