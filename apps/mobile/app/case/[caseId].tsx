import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, queryKeys } from '@valuation-os/api'
import { formatDate, getCaseStageLabel } from '@valuation-os/utils'

interface CaseDetailResponse {
  id: string
  reference: string
  stage: string
  valuationType: string
  purpose: string | null
  dueDate: string | null
  isOverdue: boolean
  branchId: string | null
  client: { id: string; name: string; type: string; email: string | null; phone: string | null }
  property: { id: string; address: string; localGovernment: string | null; state: string }
  assignedValuer: { id: string; firstName: string; lastName: string; email: string } | null
  assignedReviewer: { id: string; firstName: string; lastName: string; email: string } | null
  inspection: {
    id: string
    status: 'draft' | 'submitted'
    inspectionDate: string | null
    submittedAt: string | null
    inspector: { id: string; firstName: string; lastName: string } | null
    media: Array<{ id: string }>
  } | null
  invoice: { id: string; invoiceNumber: string; status: string; totalAmount: number } | null
  documents: Array<{ id: string; name: string; mimeType: string; createdAt: string }>
}

interface CaseActivityResponse {
  items: Array<{
    id: string
    action: string
    createdAt: string
    user: { id: string; firstName: string; lastName: string; email: string } | null
  }>
}

interface DocumentDownloadResponse {
  url: string
  name: string
  mimeType: string
}

function formatActionLabel(action: string) {
  return action.replace(/^CASE_/, '').replaceAll('_', ' ').toLowerCase()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function MobileCaseDetailScreen() {
  const params = useLocalSearchParams<{ caseId: string }>()
  const caseId = Array.isArray(params.caseId) ? params.caseId[0] : params.caseId
  const router = useRouter()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [creatingInspection, setCreatingInspection] = useState(false)
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const casePath = useMemo(() => (caseId ? `/api/v1/cases/${caseId}` : null), [caseId])

  const { data, isLoading, refetch } = useQuery({
    queryKey: caseId ? queryKeys.cases.detail(caseId) : ['mobile-case-missing'],
    enabled: Boolean(casePath),
    queryFn: () => apiGet<CaseDetailResponse>(casePath as string),
  })

  const { data: activity } = useQuery({
    queryKey: caseId ? ['mobile-case-activity', caseId] : ['mobile-case-activity-missing'],
    enabled: Boolean(caseId),
    queryFn: () => apiGet<CaseActivityResponse>(`/api/v1/cases/${caseId}/activity`),
  })

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['mobile-case-activity', caseId] })])
    setRefreshing(false)
  }

  async function createInspection() {
    if (!caseId) return
    setCreatingInspection(true)
    setError(null)

    try {
      const inspection = await apiPost<{ id: string }>(`/api/v1/cases/${caseId}/inspections`, {})
      await queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) })
      await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
      await refetch()
      router.push(`/inspection/${caseId}/${inspection.id}`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create an inspection for this case.')
    } finally {
      setCreatingInspection(false)
    }
  }

  async function openExternal(url: string) {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    }
  }

  async function openDocument(documentId: string) {
    setOpeningDocumentId(documentId)
    setError(null)

    try {
      const result = await apiGet<DocumentDownloadResponse>(`/api/v1/documents/${documentId}/download`, {
        format: 'json',
      })
      await openExternal(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this document.')
    } finally {
      setOpeningDocumentId(null)
    }
  }

  if (!caseId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerTitle}>Case not found</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Case',
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { color: '#0f172a', fontWeight: '700' },
        }}
      />

      <View style={styles.container}>
        {isLoading || !data ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#0b6a38" />
            <Text style={styles.centerSubtitle}>Loading case…</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={styles.heroBody}>
                  <Text style={styles.reference}>{data.reference}</Text>
                  <Text style={styles.clientName}>{data.client.name}</Text>
                  <Text style={styles.propertyAddress}>{data.property.address}</Text>
                </View>
                <View style={[styles.stageBadge, data.isOverdue ? styles.stageBadgeOverdue : styles.stageBadgeDefault]}>
                  <Text style={[styles.stageBadgeText, data.isOverdue ? styles.stageBadgeTextOverdue : styles.stageBadgeTextDefault]}>
                    {getCaseStageLabel(data.stage as never)}
                  </Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <Meta label="Due" value={data.dueDate ? formatDate(data.dueDate) : 'Not set'} />
                <Meta label="Valuation" value={data.valuationType} />
                <Meta label="Purpose" value={data.purpose || 'Not set'} />
                <Meta label="Location" value={data.property.state} />
              </View>
            </View>

            <Section title="Assignments" description="Who is handling the case right now.">
              <Meta label="Valuer" value={data.assignedValuer ? `${data.assignedValuer.firstName} ${data.assignedValuer.lastName}` : 'Unassigned'} />
              <Meta label="Reviewer" value={data.assignedReviewer ? `${data.assignedReviewer.firstName} ${data.assignedReviewer.lastName}` : 'Unassigned'} />
            </Section>

            <Section title="Client" description="Primary relationship details for site coordination.">
              <Meta label="Client" value={data.client.name} />
              <Meta label="Type" value={data.client.type} />
              <View style={styles.actionPillRow}>
                {data.client.phone ? (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => void openExternal(`tel:${data.client.phone}`)}
                    style={styles.actionPill}
                  >
                    <Text style={styles.actionPillText}>Call client</Text>
                  </TouchableOpacity>
                ) : null}
                {data.client.email ? (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => void openExternal(`mailto:${data.client.email}`)}
                    style={styles.actionPill}
                  >
                    <Text style={styles.actionPillText}>Email client</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Section>

            <Section title="Property" description="Where the field work is happening.">
              <Meta label="Address" value={data.property.address} />
              <Meta
                label="Area"
                value={
                  [data.property.localGovernment, data.property.state].filter(Boolean).join(', ') ||
                  data.property.state
                }
              />
            </Section>

            <Section title="Inspection" description="Open the field workspace or create a new draft.">
              {data.inspection ? (
                <>
                  <Meta label="Status" value={data.inspection.status === 'submitted' ? 'Submitted' : 'Draft'} />
                  <Meta label="Inspection Date" value={data.inspection.inspectionDate ? formatDate(data.inspection.inspectionDate) : 'Not scheduled'} />
                  <Meta label="Photos" value={`${data.inspection.media.length}`} />
                  <Link href={`/inspection/${caseId}/${data.inspection.id}`} asChild>
                    <TouchableOpacity activeOpacity={0.88} style={styles.primaryAction}>
                      <Text style={styles.primaryActionText}>Open inspection workspace</Text>
                    </TouchableOpacity>
                  </Link>
                </>
              ) : (
                <>
                  <Text style={styles.emptyText}>No inspection draft is attached to this case yet.</Text>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => void createInspection()}
                    disabled={creatingInspection}
                    style={[styles.primaryAction, creatingInspection && styles.actionDisabled]}
                  >
                    <Text style={styles.primaryActionText}>
                      {creatingInspection ? 'Creating inspection…' : 'Create inspection draft'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Section>

            <Section title="Commercials" description="Invoice and supporting file status.">
              {data.invoice ? (
                <>
                  <Meta label="Invoice" value={data.invoice.invoiceNumber} />
                  <Meta label="Status" value={data.invoice.status.replaceAll('_', ' ')} />
                  <Meta label="Amount" value={formatCurrency(data.invoice.totalAmount)} />
                </>
              ) : (
                <Text style={styles.emptyText}>No invoice has been issued for this case yet.</Text>
              )}

              <View style={styles.documentSummary}>
                <Text style={styles.documentSummaryTitle}>Documents</Text>
                {data.documents.length ? (
                  data.documents.slice(0, 4).map((document) => (
                    <View key={document.id} style={styles.documentRow}>
                      <View style={styles.documentBody}>
                        <Text style={styles.documentName}>{document.name}</Text>
                        <Text style={styles.documentMeta}>{formatDate(document.createdAt)} • {document.mimeType}</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => void openDocument(document.id)}
                        disabled={openingDocumentId === document.id}
                        style={[styles.documentAction, openingDocumentId === document.id && styles.actionDisabled]}
                      >
                        <Text style={styles.documentActionText}>
                          {openingDocumentId === document.id ? 'Opening…' : 'Open'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No supporting documents attached yet.</Text>
                )}
              </View>
            </Section>

            <Section title="Recent Activity" description="Latest case workflow updates.">
              {activity?.items.length ? (
                <View style={styles.timeline}>
                  {activity.items.slice(0, 6).map((item) => (
                    <View key={item.id} style={styles.timelineItem}>
                      <Text style={styles.timelineAction}>{formatActionLabel(item.action)}</Text>
                      <Text style={styles.timelineMeta}>
                        {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'System'} • {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No recent activity for this case yet.</Text>
              )}
            </Section>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 16,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroBody: {
    flex: 1,
  },
  reference: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  clientName: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  propertyAddress: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
  },
  stageBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stageBadgeDefault: {
    backgroundColor: '#dcfce7',
  },
  stageBadgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stageBadgeTextDefault: {
    color: '#166534',
  },
  stageBadgeTextOverdue: {
    color: '#b91c1c',
  },
  metaGrid: {
    marginTop: 16,
    gap: 10,
  },
  metaItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  section: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
  },
  sectionContent: {
    marginTop: 14,
    gap: 12,
  },
  primaryAction: {
    borderRadius: 18,
    backgroundColor: '#0b6a38',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPill: {
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  actionDisabled: {
    opacity: 0.6,
  },
  documentSummary: {
    marginTop: 6,
    gap: 10,
  },
  documentSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  documentRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  documentBody: {
    gap: 4,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  documentMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  documentAction: {
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  documentActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  timeline: {
    gap: 10,
  },
  timelineItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#0b6a38',
    paddingLeft: 12,
  },
  timelineAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  timelineMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  errorBox: {
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    padding: 14,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#b91c1c',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748b',
  },
  centerState: {
    marginTop: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  centerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
})
