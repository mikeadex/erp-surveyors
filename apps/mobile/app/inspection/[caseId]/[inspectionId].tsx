import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { File } from 'expo-file-system'
import { ApiRequestError, apiDelete, apiGet, apiPatch, apiPost, queryKeys } from '@valuation-os/api'
import { formatDate, getInspectionSubmissionIssues } from '@valuation-os/utils'
import {
  flushInspectionMediaSyncs,
  getPendingInspectionMediaSyncCount,
  queueInspectionMediaSync,
} from '@/lib/inspection-media-sync'
import { richTextToPlainText } from '@/lib/rich-text'
import { flushInspectionDraftSyncs, hasPendingInspectionDraftSync, queueInspectionDraftSync } from '@/lib/inspection-sync'
import {
  flushInspectionSubmitSyncs,
  hasPendingInspectionSubmitSync,
  queueInspectionSubmitSync,
} from '@/lib/inspection-submit-sync'
import { clearInspectionDraft, getInspectionDraft, setInspectionDraft } from '@/lib/storage'

interface InspectionDetailResponse {
  id: string
  case: {
    id: string
    reference: string
    stage: string
  }
  status: 'draft' | 'submitted'
  inspectionDate: string | null
  occupancy: string | null
  locationDescription: string | null
  externalCondition: string | null
  internalCondition: string | null
  services: string | null
  conditionSummary: string | null
  notes: string | null
  submittedAt: string | null
  inspector: { id: string; firstName: string; lastName: string }
  media: Array<{
    id: string
    s3Key: string
    caption: string | null
    takenAt: string | null
    sortOrder: number
  }>
}

type FormState = {
  inspectionDate: string
  occupancy: string
  locationDescription: string
  externalCondition: string
  internalCondition: string
  services: string
  conditionSummary: string
  notes: string
}

const PHOTO_SECTIONS = [
  { label: 'External', value: 'external_condition' },
  { label: 'Internal', value: 'internal_condition' },
  { label: 'Services', value: 'services' },
  { label: 'Surroundings', value: 'surroundings' },
  { label: 'Other', value: 'other' },
] as const

function getPhotoSectionLabel(s3Key: string) {
  const section = s3Key.split('/')[3]
  const match = PHOTO_SECTIONS.find((item) => item.value === section)
  return match?.label ?? 'Other'
}

const initialFormState: FormState = {
  inspectionDate: '',
  occupancy: '',
  locationDescription: '',
  externalCondition: '',
  internalCondition: '',
  services: '',
  conditionSummary: '',
  notes: '',
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInputValue(value: string) {
  if (!value) return new Date()
  const parts = value.split('-').map((part) => Number(part))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return new Date()
  }

  const [year, month, day] = parts
  return new Date(year, month - 1, day)
}

export default function MobileInspectionDetailScreen() {
  const params = useLocalSearchParams<{
    caseId: string
    inspectionId: string
  }>()
  const caseId = Array.isArray(params.caseId) ? params.caseId[0] : params.caseId
  const inspectionId = Array.isArray(params.inspectionId) ? params.inspectionId[0] : params.inspectionId
  const router = useRouter()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState<FormState>(initialFormState)
  const [caption, setCaption] = useState('')
  const [photoSection, setPhotoSection] = useState<(typeof PHOTO_SECTIONS)[number]['value']>('other')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [hasPendingSync, setHasPendingSync] = useState(false)
  const [pendingMediaSyncCount, setPendingMediaSyncCount] = useState(0)
  const [hasPendingSubmitSync, setHasPendingSubmitSync] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const inspectionPath = useMemo(() => {
    if (!caseId || !inspectionId) return null
    return `/api/v1/cases/${caseId}/inspections/${inspectionId}`
  }, [caseId, inspectionId])

  const { data, isLoading, refetch } = useQuery({
    queryKey: inspectionId ? queryKeys.inspections.detail(inspectionId) : ['mobile-inspection-missing'],
    enabled: Boolean(inspectionPath),
    queryFn: () => apiGet<InspectionDetailResponse>(inspectionPath as string),
  })

  const submissionIssues = useMemo(
    () =>
      getInspectionSubmissionIssues({
        inspectionDate: form.inspectionDate,
        occupancy: form.occupancy,
        locationDescription: form.locationDescription,
        externalCondition: form.externalCondition,
        internalCondition: form.internalCondition,
        services: form.services,
        conditionSummary: form.conditionSummary,
        mediaCount: (data?.media.length ?? 0) + pendingMediaSyncCount,
      }),
    [data?.media.length, form, pendingMediaSyncCount],
  )

  useEffect(() => {
    if (!data || !inspectionId) return
    const inspection = data

    let cancelled = false

    async function hydrateDraft() {
      const remoteState: FormState = {
        inspectionDate: inspection.inspectionDate ? new Date(inspection.inspectionDate).toISOString().slice(0, 10) : '',
        occupancy: inspection.occupancy ?? '',
        locationDescription: inspection.locationDescription ?? '',
        externalCondition: inspection.externalCondition ?? '',
        internalCondition: inspection.internalCondition ?? '',
        services: inspection.services ?? '',
        conditionSummary: richTextToPlainText(inspection.conditionSummary),
        notes: richTextToPlainText(inspection.notes),
      }

      const localDraft = inspection.status !== 'submitted' ? await getInspectionDraft(inspectionId) : null
      const pendingSync = inspection.status !== 'submitted' ? await hasPendingInspectionDraftSync(inspectionId) : false
      const pendingMediaCount = inspection.status !== 'submitted'
        ? await getPendingInspectionMediaSyncCount(inspectionId)
        : 0
      const pendingSubmit = inspection.status !== 'submitted'
        ? await hasPendingInspectionSubmitSync(inspectionId)
        : false
      if (cancelled) return
      setHasPendingSync(pendingSync)
      setPendingMediaSyncCount(pendingMediaCount)
      setHasPendingSubmitSync(pendingSubmit)

      if (localDraft) {
        setForm({
          inspectionDate: localDraft.inspectionDate,
          occupancy: localDraft.occupancy,
          locationDescription: localDraft.locationDescription,
          externalCondition: localDraft.externalCondition,
          internalCondition: localDraft.internalCondition,
          services: localDraft.services,
          conditionSummary: richTextToPlainText(localDraft.conditionSummary),
          notes: richTextToPlainText(localDraft.notes),
        })
        setDraftRestoredAt(localDraft.updatedAt)
        setNotice('Unsynced device draft restored. Save when you are back online.')
      } else {
        setForm(remoteState)
        setDraftRestoredAt(null)
      }

      setDraftHydrated(true)
    }

    void hydrateDraft()

    return () => {
      cancelled = true
    }
  }, [data, inspectionId])

  useEffect(() => {
    if (!inspectionId || !draftHydrated || data?.status === 'submitted') return

    const timeout = setTimeout(() => {
      void setInspectionDraft(inspectionId, form).then((stored) => {
        setDraftRestoredAt(stored.updatedAt)
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [data?.status, draftHydrated, form, inspectionId])

  async function onRefresh() {
    setRefreshing(true)
    if (inspectionId) {
      const [draftResult, mediaResult] = await Promise.all([
        flushInspectionDraftSyncs({ inspectionId }),
        flushInspectionMediaSyncs({ inspectionId }),
      ])
      const submitResult = await flushInspectionSubmitSyncs({ inspectionId })
      if (draftResult.syncedInspectionIds.includes(inspectionId)) {
        setHasPendingSync(false)
        setNotice('Pending device draft synced successfully.')
      }
      if (mediaResult.syncedInspectionIds.includes(inspectionId)) {
        const remainingMediaCount = await getPendingInspectionMediaSyncCount(inspectionId)
        setPendingMediaSyncCount(remainingMediaCount)
        setNotice(
          draftResult.syncedInspectionIds.includes(inspectionId)
            ? 'Pending draft and queued photos synced successfully.'
            : 'Queued photos synced successfully.',
        )
      }
      if (submitResult.syncedInspectionIds.includes(inspectionId)) {
        setHasPendingSubmitSync(false)
        setNotice('Inspection submitted successfully after syncing pending work.')
      }
    }
    await refetch()
    setRefreshing(false)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveDraft() {
    if (!inspectionPath || !caseId || !inspectionId) return
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      await apiPatch(inspectionPath, {
        inspectionDate: form.inspectionDate ? new Date(form.inspectionDate).toISOString() : undefined,
        occupancy: form.occupancy || undefined,
        locationDescription: form.locationDescription || undefined,
        externalCondition: form.externalCondition || undefined,
        internalCondition: form.internalCondition || undefined,
        services: form.services || undefined,
        conditionSummary: form.conditionSummary || undefined,
        notes: form.notes || undefined,
      })
      if (inspectionId) {
        await clearInspectionDraft(inspectionId)
        setDraftRestoredAt(null)
        setHasPendingSync(false)
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(inspectionId as string) })
      await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
      await refetch()
      setNotice('Inspection draft synced successfully.')
      return true
    } catch (err) {
      await queueInspectionDraftSync({
        caseId,
        inspectionId,
        payload: form,
      })
      const message = err instanceof Error ? err.message : 'Could not save inspection draft.'
      setError(message)
      setHasPendingSync(true)
      setNotice('Changes are still saved on this device. Retry syncing when connection is stable.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function submitInspection() {
    if (!inspectionPath) return
    setSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      if (submissionIssues.length) {
        setError(submissionIssues[0]?.message ?? 'Complete the required inspection items before submitting.')
        return
      }

      if (pendingMediaSyncCount > 0 || hasPendingSync) {
        await queueInspectionSubmitSync({ caseId, inspectionId })
        setHasPendingSubmitSync(true)
        setNotice('Inspection marked ready on this device. It will submit after pending draft changes and photos sync.')
        return
      }

      const draftSaved = await saveDraft()
      if (!draftSaved) {
        await queueInspectionSubmitSync({ caseId, inspectionId })
        setHasPendingSubmitSync(true)
        setNotice('Inspection submission queued. It will complete when the saved draft syncs.')
        return
      }
      await apiPost(`${inspectionPath}/submit`)
      if (inspectionId) {
        await clearInspectionDraft(inspectionId)
        setDraftRestoredAt(null)
      }
      setHasPendingSubmitSync(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(inspectionId as string) })
      await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
      await refetch()
      setNotice('Inspection submitted successfully.')
    } catch (err) {
      if (shouldQueueSubmit(err)) {
        await queueInspectionSubmitSync({ caseId, inspectionId })
        setHasPendingSubmitSync(true)
        setNotice('Inspection submission queued. It will retry automatically when the connection improves.')
      } else {
        const message = err instanceof Error ? err.message : 'Could not submit this inspection.'
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function syncPendingDraft() {
    if (!inspectionId) return
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const result = await flushInspectionDraftSyncs({ inspectionId })
      if (result.syncedInspectionIds.includes(inspectionId)) {
        setHasPendingSync(false)
        setDraftRestoredAt(null)
        setNotice('Pending device draft synced successfully.')
        await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(inspectionId) })
        await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
        await refetch()
        return
      }

      setNotice('Draft is still queued locally. Keep working and retry when the connection improves.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync the pending draft.')
    } finally {
      setSaving(false)
    }
  }

  async function syncPendingMedia() {
    if (!inspectionId) return
    setUploading(true)
    setError(null)
    setNotice(null)

    try {
      const result = await flushInspectionMediaSyncs({ inspectionId })
      const remaining = await getPendingInspectionMediaSyncCount(inspectionId)
      setPendingMediaSyncCount(remaining)

      if (result.syncedInspectionIds.includes(inspectionId)) {
        setNotice('Queued photos synced successfully.')
        await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(inspectionId) })
        await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
        await refetch()
        return
      }

      setNotice('Photos are still queued locally. Retry when the connection improves.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync queued photos.')
    } finally {
      setUploading(false)
    }
  }

  async function syncPendingSubmit() {
    if (!inspectionId) return
    setSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      const result = await flushInspectionSubmitSyncs({ inspectionId })
      const remainingMedia = await getPendingInspectionMediaSyncCount(inspectionId)
      const pendingDraft = await hasPendingInspectionDraftSync(inspectionId)

      setPendingMediaSyncCount(remainingMedia)
      setHasPendingSync(pendingDraft)

      if (result.syncedInspectionIds.includes(inspectionId)) {
        setHasPendingSubmitSync(false)
        setNotice('Inspection submitted successfully after syncing queued work.')
        await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(inspectionId) })
        await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
        await refetch()
        return
      }

      setNotice('Submission is still queued. Ensure pending draft changes and photos can sync first.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync the pending submission.')
    } finally {
      setSubmitting(false)
    }
  }

  function shouldQueueMediaUpload(err: unknown) {
    return !(err instanceof ApiRequestError && err.status < 500)
  }

  function shouldQueueSubmit(err: unknown) {
    return !(err instanceof ApiRequestError && err.status < 500)
  }

  function onInspectionDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false)
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return
    }

    updateField('inspectionDate', toDateInputValue(selectedDate))
  }

  async function uploadImage(source: 'camera' | 'library') {
    if (!caseId || !inspectionId || !data) return

    setError(null)
    setNotice(null)

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permission needed', source === 'camera'
        ? 'Camera access is required to capture inspection photos.'
        : 'Photo library access is required to pick inspection photos.')
      return
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
          exif: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
          exif: false,
        })

    if (result.canceled || !result.assets[0]) {
      return
    }

    const asset = result.assets[0]
    const fileType = asset.mimeType ?? 'image/jpeg'

    setUploading(true)

    let mediaId: string | null = null
    try {
      const createResponse = await apiPost<{
        mediaId: string
        fileKey: string
        uploadUrl: string
      }>(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media`, {
        section: photoSection,
        fileType,
        caption: caption.trim() || undefined,
      })
      mediaId = createResponse.mediaId

      const file = new File(asset.uri)
      const uploadResponse = await fetch(createResponse.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: file,
      })
      if (!uploadResponse.ok) {
        throw new Error('Photo upload failed while sending the file to storage.')
      }

      await apiPost(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media/${createResponse.mediaId}/confirm`, {
        caption: caption.trim() || undefined,
        takenAt: new Date().toISOString(),
      })

      setCaption('')
      setNotice('Photo uploaded successfully.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(inspectionId as string) })
      await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
      await refetch()
    } catch (err) {
      if (mediaId) {
        await apiDelete(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media/${mediaId}`).catch(() => undefined)
      }
      if (shouldQueueMediaUpload(err)) {
        await queueInspectionMediaSync({
          caseId,
          inspectionId,
          localUri: asset.uri,
          fileType,
          section: photoSection,
          caption: caption.trim() || null,
        })
        const remaining = await getPendingInspectionMediaSyncCount(inspectionId)
        setPendingMediaSyncCount(remaining)
        setNotice('Photo saved on this device and queued for upload when the connection returns.')
        setCaption('')
      } else {
        const message = err instanceof Error ? err.message : 'Photo upload failed.'
        setError(message)
      }
    } finally {
      setUploading(false)
    }
  }

  async function deleteMedia(mediaId: string) {
    if (!caseId || !inspectionId) return
    setDeletingId(mediaId)
    setError(null)
    setNotice(null)

    try {
      await apiDelete(`/api/v1/cases/${caseId}/inspections/${inspectionId}/media/${mediaId}`)
      setNotice('Photo removed successfully.')
      await queryClient.invalidateQueries({ queryKey: queryKeys.inspections.detail(inspectionId as string) })
      await queryClient.invalidateQueries({ queryKey: ['mobile-inspections'] })
      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not remove the photo.'
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  if (!caseId || !inspectionId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerTitle}>Inspection not found</Text>
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
          title: 'Inspection',
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { color: '#0f172a', fontWeight: '700' },
        }}
      />
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Inspection Workspace</Text>
        <Text style={styles.subheading}>
          Keep field observations, notes, and photos together before submission.
        </Text>

        {isLoading || !data ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#0b6a38" />
            <Text style={styles.centerSubtitle}>Loading inspection…</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={styles.caseReference}>{data.case.reference}</Text>
                  <Text style={styles.stageText}>{data.case.stage.replaceAll('_', ' ')}</Text>
                  <Text style={styles.metaText}>
                    Inspector: {data.inspector.firstName} {data.inspector.lastName}
                  </Text>
                </View>
                <View style={[styles.statusBadge, data.status === 'submitted' ? styles.statusSubmitted : styles.statusDraft]}>
                  <Text style={[styles.statusText, data.status === 'submitted' ? styles.statusSubmittedText : styles.statusDraftText]}>
                    {data.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </Text>
                </View>
              </View>
              <Text style={styles.metaText}>
                Inspection date: {data.inspectionDate ? formatDate(data.inspectionDate) : 'Not scheduled'}
              </Text>
              <Text style={styles.metaText}>
                Submitted: {data.submittedAt ? formatDate(data.submittedAt) : 'Not yet'}
              </Text>
              {draftRestoredAt ? (
                <Text style={styles.localDraftText}>
                  Local draft updated {formatDate(draftRestoredAt)}
                </Text>
              ) : null}
            </View>

            <Section title="Inspection Setup" description="Date, occupancy, and location context.">
              <Field label="Inspection Date">
                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={data.status === 'submitted'}
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, styles.dateInputButton, data.status === 'submitted' && styles.actionDisabled]}
                >
                  <Text style={form.inspectionDate ? styles.dateInputValue : styles.dateInputPlaceholder}>
                    {form.inspectionDate ? formatDate(parseDateInputValue(form.inspectionDate).toISOString()) : 'Pick inspection date'}
                  </Text>
                  <Text style={styles.dateInputMeta}>Tap to choose</Text>
                </TouchableOpacity>
                {showDatePicker ? (
                  <DateTimePicker
                    value={parseDateInputValue(form.inspectionDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onInspectionDateChange}
                  />
                ) : null}
              </Field>
              <Field label="Occupancy Status">
                <TextInput
                  value={form.occupancy}
                  onChangeText={(value) => updateField('occupancy', value)}
                  editable={data.status !== 'submitted'}
                  placeholder="Occupied, vacant, partly occupied"
                  style={styles.input}
                />
              </Field>
              <Field label="Location Description">
                <TextInput
                  value={form.locationDescription}
                  onChangeText={(value) => updateField('locationDescription', value)}
                  editable={data.status !== 'submitted'}
                  multiline
                  placeholder="Neighbourhood, road access, site context"
                  style={[styles.input, styles.textarea]}
                />
              </Field>
            </Section>

            <Section title="Condition" description="External, internal, and services observations.">
              <Field label="External Condition">
                <TextInput
                  value={form.externalCondition}
                  onChangeText={(value) => updateField('externalCondition', value)}
                  editable={data.status !== 'submitted'}
                  multiline
                  placeholder="Frontage, finishes, visible defects"
                  style={[styles.input, styles.textarea]}
                />
              </Field>
              <Field label="Internal Condition">
                <TextInput
                  value={form.internalCondition}
                  onChangeText={(value) => updateField('internalCondition', value)}
                  editable={data.status !== 'submitted'}
                  multiline
                  placeholder="Rooms, finishes, state of repair"
                  style={[styles.input, styles.textarea]}
                />
              </Field>
              <Field label="Services And Utilities">
                <TextInput
                  value={form.services}
                  onChangeText={(value) => updateField('services', value)}
                  editable={data.status !== 'submitted'}
                  multiline
                  placeholder="Power, water, sewage, telecoms"
                  style={[styles.input, styles.textarea]}
                />
              </Field>
            </Section>

            <Section title="Summary And Notes" description="Reviewer-facing summary and supporting notes.">
              <Field label="Condition Summary">
                <TextInput
                  value={form.conditionSummary}
                  onChangeText={(value) => updateField('conditionSummary', value)}
                  editable={data.status !== 'submitted'}
                  multiline
                  placeholder="High-level inspection conclusion"
                  style={[styles.input, styles.textareaLarge]}
                />
              </Field>
              <Field label="Inspector Notes">
                <TextInput
                  value={form.notes}
                  onChangeText={(value) => updateField('notes', value)}
                  editable={data.status !== 'submitted'}
                  multiline
                  placeholder="Extra field notes, follow-up items, risk cues"
                  style={[styles.input, styles.textareaLarge]}
                />
              </Field>
            </Section>

            {data.status !== 'submitted' ? (
              <Section
                title="Submission Readiness"
                description="Use this checklist to confirm the inspection is complete before you submit it."
              >
                {submissionIssues.length ? (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      {submissionIssues.length} required item{submissionIssues.length === 1 ? '' : 's'} still need attention.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>
                      This inspection is ready to submit once you are happy with the draft.
                    </Text>
                  </View>
                )}
                <View style={styles.readinessList}>
                  {submissionIssues.map((issue) => (
                    <View key={issue.key} style={styles.readinessItem}>
                      <Text style={styles.readinessLabel}>{issue.label}</Text>
                      <Text style={styles.readinessMessage}>{issue.message}</Text>
                    </View>
                  ))}
                </View>
              </Section>
            ) : null}

            <Section title="Photo Register" description="Capture or attach field images directly from mobile.">
              {data.status === 'submitted' ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>This inspection is already submitted, so the photo register is read-only.</Text>
                </View>
              ) : (
                <>
                  <Field label="Photo Section">
                    <View style={styles.sectionChipRow}>
                      {PHOTO_SECTIONS.map((item) => {
                        const active = item.value === photoSection
                        return (
                          <TouchableOpacity
                            key={item.value}
                            onPress={() => setPhotoSection(item.value)}
                            style={[styles.sectionChip, active ? styles.sectionChipActive : styles.sectionChipIdle]}
                          >
                            <Text style={[styles.sectionChipText, active ? styles.sectionChipTextActive : styles.sectionChipTextIdle]}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </Field>

                  <Field label="Photo Caption">
                    <TextInput
                      value={caption}
                      onChangeText={setCaption}
                      placeholder="Front facade, access road, living room finish"
                      style={styles.input}
                    />
                  </Field>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => void uploadImage('camera')}
                      disabled={uploading}
                      style={[styles.secondaryAction, uploading && styles.actionDisabled]}
                    >
                      <Text style={styles.secondaryActionText}>
                        {uploading ? 'Uploading…' : 'Use Camera'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void uploadImage('library')}
                      disabled={uploading}
                      style={[styles.primaryAction, uploading && styles.actionDisabled]}
                    >
                      <Text style={styles.primaryActionText}>
                        {uploading ? 'Uploading…' : 'Choose Photo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {data.media.length ? (
                <View style={styles.mediaGrid}>
                  {data.media.map((item) => (
                    <View key={item.id} style={styles.mediaCard}>
                      <Image
                        source={{ uri: `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1/media/${item.s3Key}` }}
                        style={styles.mediaImage}
                        resizeMode="cover"
                      />
                      <View style={styles.mediaBody}>
                        <View style={styles.mediaHeader}>
                          <View style={styles.mediaSectionBadge}>
                            <Text style={styles.mediaSectionText}>{getPhotoSectionLabel(item.s3Key)}</Text>
                          </View>
                          <Text style={styles.mediaMeta}>{item.takenAt ? formatDate(item.takenAt) : 'Just now'}</Text>
                        </View>
                        <Text style={styles.mediaCaption}>{item.caption || 'Inspection photo'}</Text>
                        {data.status !== 'submitted' ? (
                          <TouchableOpacity
                            onPress={() => void deleteMedia(item.id)}
                            disabled={deletingId === item.id}
                            style={styles.removeButton}
                          >
                            <Text style={styles.removeButtonText}>
                              {deletingId === item.id ? 'Removing…' : 'Remove'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No photos uploaded yet.</Text>
                </View>
              )}

              {pendingMediaSyncCount > 0 && data.status !== 'submitted' ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {pendingMediaSyncCount} photo{pendingMediaSyncCount === 1 ? '' : 's'} queued on this device and waiting to upload.
                  </Text>
                </View>
              ) : null}
            </Section>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {notice ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            {data.status !== 'submitted' ? (
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => void saveDraft()} disabled={saving || submitting} style={[styles.secondaryAction, (saving || submitting) && styles.actionDisabled]}>
                  <Text style={styles.secondaryActionText}>{saving ? 'Saving…' : 'Save Draft'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void submitInspection()} disabled={saving || submitting} style={[styles.primaryAction, (saving || submitting) && styles.actionDisabled]}>
                  <Text style={styles.primaryActionText}>{submitting ? 'Submitting…' : 'Submit Inspection'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {hasPendingSync && data.status !== 'submitted' ? (
              <TouchableOpacity
                onPress={() => void syncPendingDraft()}
                disabled={saving || submitting}
                style={[styles.pendingSyncButton, (saving || submitting) && styles.actionDisabled]}
              >
                <Text style={styles.pendingSyncButtonText}>
                  {saving ? 'Syncing…' : 'Sync Pending Draft'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {pendingMediaSyncCount > 0 && data.status !== 'submitted' ? (
              <TouchableOpacity
                onPress={() => void syncPendingMedia()}
                disabled={uploading || saving || submitting}
                style={[styles.pendingSyncButton, (uploading || saving || submitting) && styles.actionDisabled]}
              >
                <Text style={styles.pendingSyncButtonText}>
                  {uploading ? 'Syncing Photos…' : `Sync Pending Photos (${pendingMediaSyncCount})`}
                </Text>
              </TouchableOpacity>
            ) : null}

            {hasPendingSubmitSync && data.status !== 'submitted' ? (
              <TouchableOpacity
                onPress={() => void syncPendingSubmit()}
                disabled={uploading || saving || submitting}
                style={[styles.pendingSyncButton, (uploading || saving || submitting) && styles.actionDisabled]}
              >
                <Text style={styles.pendingSyncButtonText}>
                  {submitting ? 'Syncing Submission…' : 'Sync Pending Submission'}
                </Text>
              </TouchableOpacity>
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subheading: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#64748b',
  },
  stack: {
    marginTop: 18,
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
  caseReference: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  stageText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#0b6a38',
    textTransform: 'capitalize',
  },
  metaText: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
  },
  localDraftText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#0b6a38',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusDraft: {
    backgroundColor: '#fef3c7',
  },
  statusSubmitted: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusDraftText: {
    color: '#b45309',
  },
  statusSubmittedText: {
    color: '#15803d',
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
  readinessList: {
    gap: 10,
  },
  readinessItem: {
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readinessLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  readinessMessage: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#78350f',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  dateInputButton: {
    minHeight: 56,
    justifyContent: 'center',
  },
  dateInputValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  dateInputPlaceholder: {
    fontSize: 15,
    color: '#64748b',
  },
  dateInputMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#0b6a38',
    fontWeight: '600',
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  textareaLarge: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  sectionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sectionChipActive: {
    backgroundColor: '#0b6a38',
  },
  sectionChipIdle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
  },
  sectionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionChipTextActive: {
    color: '#ffffff',
  },
  sectionChipTextIdle: {
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
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
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  actionDisabled: {
    opacity: 0.6,
  },
  pendingSyncButton: {
    borderRadius: 18,
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pendingSyncButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  mediaGrid: {
    gap: 12,
  },
  mediaCard: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
  },
  mediaImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  mediaBody: {
    padding: 14,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  mediaSectionBadge: {
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mediaSectionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediaCaption: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  mediaMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
  },
  removeButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
  },
  infoBox: {
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1e3a8a',
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
  noticeBox: {
    borderRadius: 18,
    backgroundColor: '#ecfdf3',
    padding: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#166534',
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
