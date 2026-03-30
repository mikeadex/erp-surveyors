import * as SecureStore from 'expo-secure-store'

const SESSION_KEYS = [
  'access_token',
  'refresh_token',
  'user_id',
  'firm_id',
  'branch_id',
  'role',
  'expo_push_token',
] as const

const INSPECTION_DRAFT_PREFIX = 'inspection_draft_'
const INSPECTION_SYNC_QUEUE_KEY = 'inspection_sync_queue'
const INSPECTION_MEDIA_SYNC_QUEUE_KEY = 'inspection_media_sync_queue'
const INSPECTION_SUBMIT_QUEUE_KEY = 'inspection_submit_queue'

export interface StoredSessionContext {
  userId: string
  firmId: string
  role: string
  branchId?: string | null
}

export interface SessionSnapshot {
  accessToken?: string
  refreshToken?: string
  userId?: string
  firmId?: string
  branchId?: string
  role?: string
  expoPushToken?: string
}

type SessionKey = (typeof SESSION_KEYS)[number]

let snapshot: SessionSnapshot = {}
let hydrated = false
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

async function persistValue(key: SessionKey, value?: string) {
  if (value) {
    await SecureStore.setItemAsync(key, value)
    return
  }

  await SecureStore.deleteItemAsync(key)
}

function updateSnapshot(next: SessionSnapshot) {
  snapshot = next
  emitChange()
}

export async function hydrateSession() {
  const entries = await Promise.all(
    SESSION_KEYS.map(async (key) => [key, await SecureStore.getItemAsync(key)] as const),
  )

  snapshot = {
    accessToken: entries.find(([key]) => key === 'access_token')?.[1] ?? undefined,
    refreshToken: entries.find(([key]) => key === 'refresh_token')?.[1] ?? undefined,
    userId: entries.find(([key]) => key === 'user_id')?.[1] ?? undefined,
    firmId: entries.find(([key]) => key === 'firm_id')?.[1] ?? undefined,
    branchId: entries.find(([key]) => key === 'branch_id')?.[1] ?? undefined,
    role: entries.find(([key]) => key === 'role')?.[1] ?? undefined,
    expoPushToken: entries.find(([key]) => key === 'expo_push_token')?.[1] ?? undefined,
  }
  hydrated = true
  emitChange()
}

export function isSessionHydrated() {
  return hydrated
}

export function getAccessToken(): string | undefined {
  return snapshot.accessToken
}

export function getRefreshToken(): string | undefined {
  return snapshot.refreshToken
}

export function setSessionTokens(tokens: { accessToken: string; refreshToken?: string }) {
  const nextSnapshot: SessionSnapshot = {
    ...snapshot,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? snapshot.refreshToken,
  }

  updateSnapshot(nextSnapshot)
  void persistValue('access_token', tokens.accessToken)
  if (tokens.refreshToken) {
    void persistValue('refresh_token', tokens.refreshToken)
  }
}

export function setSessionContext(context: StoredSessionContext) {
  const nextSnapshot: SessionSnapshot = {
    ...snapshot,
    userId: context.userId,
    firmId: context.firmId,
    role: context.role,
    branchId: context.branchId ?? undefined,
  }

  updateSnapshot(nextSnapshot)
  void persistValue('user_id', context.userId)
  void persistValue('firm_id', context.firmId)
  void persistValue('role', context.role)
  void persistValue('branch_id', context.branchId ?? undefined)
}

export function setExpoPushToken(token: string) {
  updateSnapshot({
    ...snapshot,
    expoPushToken: token,
  })
  void persistValue('expo_push_token', token)
}

export function getExpoPushToken(): string | undefined {
  return snapshot.expoPushToken
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot
}

export function subscribeToSession(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function clearSession() {
  updateSnapshot({})
  void Promise.all(SESSION_KEYS.map((key) => SecureStore.deleteItemAsync(key)))
}

export interface StoredInspectionDraft {
  inspectionDate: string
  occupancy: string
  locationDescription: string
  externalCondition: string
  internalCondition: string
  services: string
  conditionSummary: string
  notes: string
  updatedAt: string
}

export interface StoredInspectionSyncJob {
  caseId: string
  inspectionId: string
  payload: Omit<StoredInspectionDraft, 'updatedAt'>
  queuedAt: string
}

export type InspectionPhotoSection =
  | 'external_condition'
  | 'internal_condition'
  | 'services'
  | 'surroundings'
  | 'other'

export interface StoredInspectionMediaSyncJob {
  jobId: string
  caseId: string
  inspectionId: string
  localUri: string
  fileType: string
  section: InspectionPhotoSection
  caption?: string | null
  queuedAt: string
}

export interface StoredInspectionSubmitSyncJob {
  inspectionId: string
  caseId: string
  queuedAt: string
}

function toSecureStoreSafeKeyPart(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, '_')
}

function getInspectionDraftKey(inspectionId: string) {
  return `${INSPECTION_DRAFT_PREFIX}${toSecureStoreSafeKeyPart(inspectionId)}`
}

export async function getInspectionDraft(inspectionId: string) {
  const stored = await SecureStore.getItemAsync(getInspectionDraftKey(inspectionId))
  if (!stored) return null

  try {
    return JSON.parse(stored) as StoredInspectionDraft
  } catch {
    await SecureStore.deleteItemAsync(getInspectionDraftKey(inspectionId))
    return null
  }
}

export async function setInspectionDraft(
  inspectionId: string,
  draft: Omit<StoredInspectionDraft, 'updatedAt'>,
) {
  const payload: StoredInspectionDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  }

  await SecureStore.setItemAsync(getInspectionDraftKey(inspectionId), JSON.stringify(payload))
  return payload
}

export async function clearInspectionDraft(inspectionId: string) {
  await SecureStore.deleteItemAsync(getInspectionDraftKey(inspectionId))
}

async function getInspectionSyncQueue() {
  const stored = await SecureStore.getItemAsync(INSPECTION_SYNC_QUEUE_KEY)
  if (!stored) return [] as StoredInspectionSyncJob[]

  try {
    return JSON.parse(stored) as StoredInspectionSyncJob[]
  } catch {
    await SecureStore.deleteItemAsync(INSPECTION_SYNC_QUEUE_KEY)
    return [] as StoredInspectionSyncJob[]
  }
}

async function setInspectionSyncQueue(queue: StoredInspectionSyncJob[]) {
  if (!queue.length) {
    await SecureStore.deleteItemAsync(INSPECTION_SYNC_QUEUE_KEY)
    return
  }

  await SecureStore.setItemAsync(INSPECTION_SYNC_QUEUE_KEY, JSON.stringify(queue))
}

export async function listInspectionSyncJobs() {
  return getInspectionSyncQueue()
}

export async function getInspectionSyncJob(inspectionId: string) {
  const queue = await getInspectionSyncQueue()
  return queue.find((job) => job.inspectionId === inspectionId) ?? null
}

export async function upsertInspectionSyncJob(job: Omit<StoredInspectionSyncJob, 'queuedAt'>) {
  const queue = await getInspectionSyncQueue()
  const nextJob: StoredInspectionSyncJob = {
    ...job,
    queuedAt: new Date().toISOString(),
  }
  const filtered = queue.filter((item) => item.inspectionId !== job.inspectionId)
  filtered.unshift(nextJob)
  await setInspectionSyncQueue(filtered)
  return nextJob
}

export async function removeInspectionSyncJob(inspectionId: string) {
  const queue = await getInspectionSyncQueue()
  await setInspectionSyncQueue(queue.filter((item) => item.inspectionId !== inspectionId))
}

async function getInspectionMediaSyncQueue() {
  const stored = await SecureStore.getItemAsync(INSPECTION_MEDIA_SYNC_QUEUE_KEY)
  if (!stored) return [] as StoredInspectionMediaSyncJob[]

  try {
    return JSON.parse(stored) as StoredInspectionMediaSyncJob[]
  } catch {
    await SecureStore.deleteItemAsync(INSPECTION_MEDIA_SYNC_QUEUE_KEY)
    return [] as StoredInspectionMediaSyncJob[]
  }
}

async function setInspectionMediaSyncQueue(queue: StoredInspectionMediaSyncJob[]) {
  if (!queue.length) {
    await SecureStore.deleteItemAsync(INSPECTION_MEDIA_SYNC_QUEUE_KEY)
    return
  }

  await SecureStore.setItemAsync(INSPECTION_MEDIA_SYNC_QUEUE_KEY, JSON.stringify(queue))
}

export async function listInspectionMediaSyncJobs() {
  return getInspectionMediaSyncQueue()
}

export async function listInspectionMediaSyncJobsForInspection(inspectionId: string) {
  const queue = await getInspectionMediaSyncQueue()
  return queue.filter((item) => item.inspectionId === inspectionId)
}

export async function enqueueInspectionMediaSyncJob(
  job: Omit<StoredInspectionMediaSyncJob, 'jobId' | 'queuedAt'>,
) {
  const queue = await getInspectionMediaSyncQueue()
  const nextJob: StoredInspectionMediaSyncJob = {
    ...job,
    jobId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  }
  queue.unshift(nextJob)
  await setInspectionMediaSyncQueue(queue)
  return nextJob
}

export async function removeInspectionMediaSyncJob(jobId: string) {
  const queue = await getInspectionMediaSyncQueue()
  await setInspectionMediaSyncQueue(queue.filter((item) => item.jobId !== jobId))
}

async function getInspectionSubmitSyncQueue() {
  const stored = await SecureStore.getItemAsync(INSPECTION_SUBMIT_QUEUE_KEY)
  if (!stored) return [] as StoredInspectionSubmitSyncJob[]

  try {
    return JSON.parse(stored) as StoredInspectionSubmitSyncJob[]
  } catch {
    await SecureStore.deleteItemAsync(INSPECTION_SUBMIT_QUEUE_KEY)
    return [] as StoredInspectionSubmitSyncJob[]
  }
}

async function setInspectionSubmitSyncQueue(queue: StoredInspectionSubmitSyncJob[]) {
  if (!queue.length) {
    await SecureStore.deleteItemAsync(INSPECTION_SUBMIT_QUEUE_KEY)
    return
  }

  await SecureStore.setItemAsync(INSPECTION_SUBMIT_QUEUE_KEY, JSON.stringify(queue))
}

export async function listInspectionSubmitSyncJobs() {
  return getInspectionSubmitSyncQueue()
}

export async function getInspectionSubmitSyncJob(inspectionId: string) {
  const queue = await getInspectionSubmitSyncQueue()
  return queue.find((item) => item.inspectionId === inspectionId) ?? null
}

export async function enqueueInspectionSubmitSyncJob(
  job: Omit<StoredInspectionSubmitSyncJob, 'queuedAt'>,
) {
  const queue = await getInspectionSubmitSyncQueue()
  const nextJob: StoredInspectionSubmitSyncJob = {
    ...job,
    queuedAt: new Date().toISOString(),
  }
  const filtered = queue.filter((item) => item.inspectionId !== job.inspectionId)
  filtered.unshift(nextJob)
  await setInspectionSubmitSyncQueue(filtered)
  return nextJob
}

export async function removeInspectionSubmitSyncJob(inspectionId: string) {
  const queue = await getInspectionSubmitSyncQueue()
  await setInspectionSubmitSyncQueue(queue.filter((item) => item.inspectionId !== inspectionId))
}
