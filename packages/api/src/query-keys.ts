export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  users: {
    all: (firmId: string) => ['users', firmId] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  firms: {
    me: () => ['firms', 'me'] as const,
    branches: (firmId: string) => ['firms', firmId, 'branches'] as const,
  },
  clients: {
    all: (firmId: string, search?: string) =>
      search ? ['clients', firmId, search] : ['clients', firmId],
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  properties: {
    all: (firmId: string) => ['properties', firmId] as const,
    detail: (id: string) => ['properties', 'detail', id] as const,
  },
  cases: {
    all: (firmId: string, filters?: Record<string, unknown>) =>
      filters ? ['cases', firmId, filters] : ['cases', firmId],
    detail: (id: string) => ['cases', 'detail', id] as const,
    overdue: (firmId: string) => ['cases', firmId, 'overdue'] as const,
  },
  inspections: {
    byCaseId: (caseId: string) => ['inspections', 'case', caseId] as const,
    detail: (id: string) => ['inspections', 'detail', id] as const,
  },
  comparables: {
    all: (firmId: string, search?: string) =>
      search ? ['comparables', firmId, search] : ['comparables', firmId],
    byCase: (caseId: string) => ['comparables', 'case', caseId] as const,
    importJob: (jobId: string) => ['comparables', 'import', jobId] as const,
  },
  analysis: {
    byCase: (caseId: string) => ['analysis', 'case', caseId] as const,
  },
  reports: {
    byCase: (caseId: string) => ['reports', 'case', caseId] as const,
    templates: (firmId: string) => ['reports', 'templates', firmId] as const,
  },
  invoices: {
    all: (firmId: string) => ['invoices', firmId] as const,
    byCase: (caseId: string) => ['invoices', 'case', caseId] as const,
  },
  notifications: {
    all: (userId: string) => ['notifications', userId] as const,
    unreadCount: (userId: string) => ['notifications', userId, 'count'] as const,
  },
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    casesByStage: () => ['dashboard', 'casesByStage'] as const,
    revenue: () => ['dashboard', 'revenue'] as const,
  },
} as const
