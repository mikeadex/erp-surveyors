import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, queryKeys } from '@valuation-os/api'
import { formatDate, getCaseStageLabel } from '@valuation-os/utils'
import * as DocumentPicker from 'expo-document-picker'

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
  documents: Array<{ id: string; name: string; mimeType: string; category: string | null; tags?: string[]; createdAt: string }>
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

interface CaseComparablesResponse {
  items: Array<{
    id: string
    comparableId: string
    weight: string | number | null
    relevanceScore: number | null
    adjustmentAmount: string | number | null
    adjustmentNote: string | null
    comparable: {
      id: string
      comparableType: string
      address: string
      city: string | null
      state: string | null
      propertyUse: string | null
      salePrice: string | number | null
      rentalValue: string | number | null
      pricePerSqm: string | number | null
      transactionDate: string | null
      source: string | null
      isVerified: boolean
    }
  }>
}

interface ComparablesLibraryResponse {
  items: Array<{
    id: string
    comparableType: string
    address: string
    city: string | null
    state: string | null
    salePrice: string | number | null
    rentalValue: string | number | null
    transactionDate: string | null
    pricePerSqm: string | number | null
    source: string | null
    isVerified: boolean
  }>
}

type QuickComparableForm = {
  comparableType: 'sales' | 'rental' | 'land'
  address: string
  city: string
  state: string
  salePrice: string
  rentalValue: string
  source: string
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
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [selectedDocumentAsset, setSelectedDocumentAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [documentCategory, setDocumentCategory] = useState('')
  const [documentTags, setDocumentTags] = useState('')
  const [attachModalVisible, setAttachModalVisible] = useState(false)
  const [quickCreateVisible, setQuickCreateVisible] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryType, setLibraryType] = useState<'sales' | 'rental' | 'land' | 'all'>('all')
  const [librarySort, setLibrarySort] = useState<'recent' | 'verified' | 'higher_value'>('recent')
  const [attachingComparableId, setAttachingComparableId] = useState<string | null>(null)
  const [creatingComparable, setCreatingComparable] = useState(false)
  const [quickComparable, setQuickComparable] = useState<QuickComparableForm>({
    comparableType: 'sales',
    address: '',
    city: '',
    state: '',
    salePrice: '',
    rentalValue: '',
    source: '',
  })
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

  const { data: caseComparables, refetch: refetchComparables } = useQuery({
    queryKey: caseId ? queryKeys.comparables.byCase(caseId) : ['mobile-case-comparables-missing'],
    enabled: Boolean(caseId),
    queryFn: () => apiGet<CaseComparablesResponse>(`/api/v1/cases/${caseId}/comparables`),
  })

  const { data: libraryComparables, isFetching: isFetchingLibrary } = useQuery({
    queryKey: caseId
      ? ['mobile-comparables-library', caseId, librarySearch, libraryType]
      : ['mobile-comparables-library-missing'],
    enabled: Boolean(caseId) && attachModalVisible,
    queryFn: () =>
      apiGet<ComparablesLibraryResponse>('/api/v1/comparables', {
        pageSize: 12,
        ...(librarySearch.trim() ? { q: librarySearch.trim() } : {}),
        ...(libraryType !== 'all' ? { comparableType: libraryType } : {}),
      }),
  })

  const sortedLibraryComparables = useMemo(() => {
    const items = [...(libraryComparables?.items ?? [])]

    if (librarySort === 'verified') {
      return items.sort((a, b) => Number(b.isVerified) - Number(a.isVerified))
    }

    if (librarySort === 'higher_value') {
      return items.sort((a, b) => {
        const aValue = Number(a.salePrice ?? a.rentalValue ?? 0)
        const bValue = Number(b.salePrice ?? b.rentalValue ?? 0)
        return bValue - aValue
      })
    }

    return items.sort((a, b) => {
      const aTime = a.transactionDate ? new Date(a.transactionDate).getTime() : 0
      const bTime = b.transactionDate ? new Date(b.transactionDate).getTime() : 0
      return bTime - aTime
    })
  }, [libraryComparables?.items, librarySort])

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([
      refetch(),
      refetchComparables(),
      queryClient.invalidateQueries({ queryKey: ['mobile-case-activity', caseId] }),
    ])
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

  async function pickDocument() {
    setError(null)

    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
      ],
    })

    if (result.canceled || !result.assets?.length) return

    const asset = result.assets[0]
    setSelectedDocumentAsset(asset)
    if (!documentName.trim()) {
      setDocumentName(asset.name)
    }
  }

  async function uploadDocumentForCase() {
    if (!caseId) return
    if (!selectedDocumentAsset) {
      setError('Choose a document before uploading.')
      return
    }

    setUploadingDocument(true)
    setError(null)

    let documentId: string | null = null

    try {
      const createResult = await apiPost<{ documentId: string; uploadUrl: string }>('/api/v1/documents', {
        caseId,
        name: documentName.trim() || selectedDocumentAsset.name,
        category: documentCategory.trim() || undefined,
        tags: documentTags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        mimeType: selectedDocumentAsset.mimeType || 'application/octet-stream',
        sizeBytes: selectedDocumentAsset.size ?? 1,
      })

      documentId = createResult.documentId

      const localFileResponse = await fetch(selectedDocumentAsset.uri)
      const blob = await localFileResponse.blob()

      const uploadResponse = await fetch(createResult.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedDocumentAsset.mimeType || 'application/octet-stream',
        },
        body: blob,
      })

      if (!uploadResponse.ok) {
        throw new Error('The document upload did not complete successfully.')
      }

      await apiPost('/api/v1/documents/confirm', { documentId })

      setUploadModalVisible(false)
      setSelectedDocumentAsset(null)
      setDocumentName('')
      setDocumentCategory('')
      setDocumentTags('')
      await refetch()
    } catch (err) {
      if (documentId) {
        try {
          await apiDelete(`/api/v1/documents/${documentId}`)
        } catch {
          // Ignore cleanup failures on mobile.
        }
      }
      setError(err instanceof Error ? err.message : 'Could not upload this document.')
    } finally {
      setUploadingDocument(false)
    }
  }

  async function deleteDocument(documentId: string) {
    setDeletingDocumentId(documentId)
    setError(null)

    try {
      await apiDelete(`/api/v1/documents/${documentId}`)
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this document.')
    } finally {
      setDeletingDocumentId(null)
    }
  }

  function confirmDeleteDocument(documentId: string, name: string) {
    Alert.alert(
      'Remove document',
      `Remove "${name}" from this case?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void deleteDocument(documentId)
          },
        },
      ],
    )
  }

  async function attachComparable(comparableId: string) {
    if (!caseId) return
    setAttachingComparableId(comparableId)
    setError(null)

    try {
      await apiPost(`/api/v1/cases/${caseId}/comparables`, { comparableId })
      await refetchComparables()
      setAttachModalVisible(false)
      setLibrarySearch('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach this comparable.')
    } finally {
      setAttachingComparableId(null)
    }
  }

  async function createAndAttachComparable() {
    if (!caseId) return

    setCreatingComparable(true)
    setError(null)

    try {
      const created = await apiPost<{ id: string }>('/api/v1/comparables', {
        comparableType: quickComparable.comparableType,
        address: quickComparable.address,
        city: quickComparable.city || undefined,
        state: quickComparable.state || undefined,
        salePrice:
          quickComparable.comparableType !== 'rental' && quickComparable.salePrice
            ? Number(quickComparable.salePrice)
            : undefined,
        rentalValue:
          quickComparable.comparableType === 'rental' && quickComparable.rentalValue
            ? Number(quickComparable.rentalValue)
            : undefined,
        source: quickComparable.source || undefined,
      })

      await apiPost(`/api/v1/cases/${caseId}/comparables`, { comparableId: created.id })
      await refetchComparables()
      setQuickCreateVisible(false)
      setQuickComparable({
        comparableType: 'sales',
        address: '',
        city: '',
        state: '',
        salePrice: '',
        rentalValue: '',
        source: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create and attach the comparable.')
    } finally {
      setCreatingComparable(false)
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
    <>
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

              <Section title="Comparables" description="View valuation evidence and attach more from the field.">
                {caseComparables?.items.length ? (
                  <View style={styles.comparableList}>
                    {caseComparables.items.map((item) => (
                      <View key={item.id} style={styles.comparableCard}>
                        <View style={styles.comparableHeader}>
                          <View style={styles.comparableBody}>
                            <Text style={styles.comparableAddress}>{item.comparable.address}</Text>
                            <Text style={styles.comparableMeta}>
                              {[item.comparable.city, item.comparable.state].filter(Boolean).join(', ') || 'No location'}
                            </Text>
                          </View>
                          <View style={styles.comparableTypeBadge}>
                            <Text style={styles.comparableTypeText}>{item.comparable.comparableType}</Text>
                          </View>
                        </View>

                        <View style={styles.comparablePillRow}>
                          {item.comparable.isVerified ? (
                            <View style={styles.verifiedPill}>
                              <Text style={styles.verifiedPillText}>Verified</Text>
                            </View>
                          ) : null}
                          {item.weight ? (
                            <View style={styles.infoPill}>
                              <Text style={styles.infoPillText}>Weight {item.weight}</Text>
                            </View>
                          ) : null}
                          {item.relevanceScore ? (
                            <View style={styles.infoPill}>
                              <Text style={styles.infoPillText}>Relevance {item.relevanceScore}/5</Text>
                            </View>
                          ) : null}
                        </View>

                        <Meta
                          label="Value"
                          value={
                            item.comparable.salePrice
                              ? formatCurrency(Number(item.comparable.salePrice))
                              : item.comparable.rentalValue
                                ? `${formatCurrency(Number(item.comparable.rentalValue))}/yr`
                                : 'Not recorded'
                          }
                        />

                        <Link href={`/comparable/${item.comparable.id}`} asChild>
                          <TouchableOpacity activeOpacity={0.88} style={styles.secondaryAction}>
                            <Text style={styles.secondaryActionText}>Open record</Text>
                          </TouchableOpacity>
                        </Link>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No comparables attached to this case yet.</Text>
                )}

                <View style={styles.actionPillRow}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => setAttachModalVisible(true)}
                    style={styles.actionPill}
                  >
                    <Text style={styles.actionPillText}>Attach from library</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => setQuickCreateVisible(true)}
                    style={styles.actionPill}
                  >
                    <Text style={styles.actionPillText}>Quick add comparable</Text>
                  </TouchableOpacity>
                </View>
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
                  <View style={styles.documentSummaryHeader}>
                    <Text style={styles.documentSummaryTitle}>Documents</Text>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => setUploadModalVisible(true)}
                      style={styles.documentAddAction}
                    >
                      <Text style={styles.documentAddActionText}>Upload</Text>
                    </TouchableOpacity>
                  </View>
                  {data.documents.length ? (
                    data.documents.map((document) => (
                      <View key={document.id} style={styles.documentRow}>
                        <View style={styles.documentBody}>
                          <Text style={styles.documentName}>{document.name}</Text>
                          <Text style={styles.documentMeta}>
                            {formatDate(document.createdAt)} • {document.category || document.mimeType}
                          </Text>
                          {document.tags?.length ? (
                            <Text style={styles.documentTagLine}>{document.tags.join(' • ')}</Text>
                          ) : null}
                        </View>
                        <View style={styles.documentActionColumn}>
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
                          <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => confirmDeleteDocument(document.id, document.name)}
                            disabled={deletingDocumentId === document.id}
                            style={[styles.documentDeleteAction, deletingDocumentId === document.id && styles.actionDisabled]}
                          >
                            <Text style={styles.documentDeleteActionText}>
                              {deletingDocumentId === document.id ? 'Removing…' : 'Remove'}
                            </Text>
                          </TouchableOpacity>
                        </View>
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

      <Modal
        visible={attachModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAttachModalVisible(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Attach Comparable</Text>
            <TouchableOpacity onPress={() => setAttachModalVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput
              value={librarySearch}
              onChangeText={setLibrarySearch}
              placeholder="Search address, city, state, source"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <View style={styles.segmentRow}>
              {(['all', 'sales', 'rental', 'land'] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setLibraryType(value)}
                  style={[
                    styles.segmentButton,
                    libraryType === value && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      libraryType === value && styles.segmentButtonTextActive,
                    ]}
                  >
                    {value === 'all' ? 'All' : value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.segmentRow}>
              {([
                { value: 'recent', label: 'Recent' },
                { value: 'verified', label: 'Verified first' },
                { value: 'higher_value', label: 'Higher value' },
              ] as const).map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setLibrarySort(item.value)}
                  style={[
                    styles.segmentButton,
                    librarySort === item.value && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      librarySort === item.value && styles.segmentButtonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isFetchingLibrary ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#0b6a38" />
                <Text style={styles.centerSubtitle}>Loading comparables…</Text>
              </View>
            ) : sortedLibraryComparables.length ? (
              <View style={styles.comparableList}>
                {sortedLibraryComparables.map((item) => (
                  <View key={item.id} style={styles.comparableCard}>
                    <View style={styles.comparableHeader}>
                      <View style={styles.comparableBody}>
                        <Text style={styles.comparableAddress}>{item.address}</Text>
                        <Text style={styles.comparableMeta}>
                          {[item.city, item.state].filter(Boolean).join(', ') || 'No location'}
                        </Text>
                      </View>
                      <View style={styles.comparableTypeBadge}>
                        <Text style={styles.comparableTypeText}>{item.comparableType}</Text>
                      </View>
                    </View>

                    <Meta
                      label="Value"
                      value={
                        item.salePrice
                          ? formatCurrency(Number(item.salePrice))
                          : item.rentalValue
                            ? `${formatCurrency(Number(item.rentalValue))}/yr`
                            : 'Not recorded'
                      }
                    />

                    <Link href={`/comparable/${item.id}`} asChild>
                      <TouchableOpacity activeOpacity={0.88} style={styles.secondaryAction}>
                        <Text style={styles.secondaryActionText}>Open record</Text>
                      </TouchableOpacity>
                    </Link>

                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => void attachComparable(item.id)}
                      disabled={attachingComparableId === item.id}
                      style={[styles.primaryAction, attachingComparableId === item.id && styles.actionDisabled]}
                    >
                      <Text style={styles.primaryActionText}>
                        {attachingComparableId === item.id ? 'Attaching…' : 'Attach comparable'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No matching comparables found in the library.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={quickCreateVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setQuickCreateVisible(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quick Add Comparable</Text>
            <TouchableOpacity onPress={() => setQuickCreateVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.segmentRow}>
              {(['sales', 'rental', 'land'] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setQuickComparable((current) => ({ ...current, comparableType: value }))}
                  style={[
                    styles.segmentButton,
                    quickComparable.comparableType === value && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      quickComparable.comparableType === value && styles.segmentButtonTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={quickComparable.address}
              onChangeText={(value) => setQuickComparable((current) => ({ ...current, address: value }))}
              placeholder="Address"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <TextInput
              value={quickComparable.city}
              onChangeText={(value) => setQuickComparable((current) => ({ ...current, city: value }))}
              placeholder="City"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <TextInput
              value={quickComparable.state}
              onChangeText={(value) => setQuickComparable((current) => ({ ...current, state: value }))}
              placeholder="State"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            {quickComparable.comparableType === 'rental' ? (
              <TextInput
                value={quickComparable.rentalValue}
                onChangeText={(value) => setQuickComparable((current) => ({ ...current, rentalValue: value }))}
                placeholder="Annual rental value"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                style={styles.input}
              />
            ) : (
              <TextInput
                value={quickComparable.salePrice}
                onChangeText={(value) => setQuickComparable((current) => ({ ...current, salePrice: value }))}
                placeholder="Sale price"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                style={styles.input}
              />
            )}
            <TextInput
              value={quickComparable.source}
              onChangeText={(value) => setQuickComparable((current) => ({ ...current, source: value }))}
              placeholder="Source"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => void createAndAttachComparable()}
              disabled={creatingComparable}
              style={[styles.primaryAction, creatingComparable && styles.actionDisabled]}
            >
              <Text style={styles.primaryActionText}>
                {creatingComparable ? 'Saving comparable…' : 'Create and attach'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload Document</Text>
            <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => void pickDocument()}
              style={styles.documentPicker}
            >
              <Text style={styles.documentPickerTitle}>
                {selectedDocumentAsset ? selectedDocumentAsset.name : 'Choose a file'}
              </Text>
              <Text style={styles.documentPickerSubtitle}>
                PDF, Word, Excel, JPEG, or PNG up to 50MB
              </Text>
            </TouchableOpacity>

            <TextInput
              value={documentName}
              onChangeText={setDocumentName}
              placeholder="Document name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <TextInput
              value={documentCategory}
              onChangeText={setDocumentCategory}
              placeholder="Category"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <TextInput
              value={documentTags}
              onChangeText={setDocumentTags}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <View style={styles.documentLinkCard}>
              <Text style={styles.documentLinkTitle}>Linked record</Text>
              <Text style={styles.documentLinkBody}>
                This upload will be linked to {data?.reference ?? 'this case'} and will inherit the case client and property automatically.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => void uploadDocumentForCase()}
              disabled={uploadingDocument}
              style={[styles.primaryAction, uploadingDocument && styles.actionDisabled]}
            >
              <Text style={styles.primaryActionText}>
                {uploadingDocument ? 'Uploading document…' : 'Upload document'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
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
  secondaryAction: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
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
  comparableList: {
    gap: 10,
  },
  comparableCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 10,
  },
  comparableHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  comparableBody: {
    flex: 1,
    gap: 4,
  },
  comparableAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  comparableMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  comparableTypeBadge: {
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  comparableTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'capitalize',
  },
  comparablePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verifiedPill: {
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  infoPill: {
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  documentSummary: {
    marginTop: 6,
    gap: 10,
  },
  documentSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  documentSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  documentAddAction: {
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  documentAddActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
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
  documentTagLine: {
    fontSize: 11,
    color: '#94a3b8',
  },
  documentActionColumn: {
    gap: 8,
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
  documentDeleteAction: {
    borderRadius: 999,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  documentDeleteActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  documentPicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
  },
  documentPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  documentPickerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  documentLinkCard: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  documentLinkTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  documentLinkBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
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
  modalScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b6a38',
  },
  modalContent: {
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#0b6a38',
    borderColor: '#0b6a38',
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'capitalize',
  },
  segmentButtonTextActive: {
    color: '#ffffff',
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
