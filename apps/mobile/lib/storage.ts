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
