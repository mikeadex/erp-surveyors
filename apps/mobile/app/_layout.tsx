import { useEffect, useState, useSyncExternalStore } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import '../global.css'
import { setApiAuth, setApiBaseUrl } from '@valuation-os/api'
import { flushInspectionMediaSyncs } from '@/lib/inspection-media-sync'
import { flushInspectionDraftSyncs } from '@/lib/inspection-sync'
import { flushInspectionSubmitSyncs } from '@/lib/inspection-submit-sync'
import { registerForPushNotifications } from '@/lib/notifications'
import { routeFromNotification } from '@/lib/notification-routing'
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getSessionSnapshot,
  hydrateSession,
  isSessionHydrated,
  setSessionTokens,
  subscribeToSession,
} from '@/lib/storage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
})

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const navigationState = useRootNavigationState()
  const [storageReady, setStorageReady] = useState(isSessionHydrated())
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot)

  useEffect(() => {
    setApiBaseUrl(API_BASE_URL)
    setApiAuth({
      getAccessToken,
      getRefreshToken,
      setTokens: setSessionTokens,
      clearTokens: clearSession,
    })
    void hydrateSession().finally(() => setStorageReady(true))
  }, [])

  useEffect(() => {
    if (!storageReady || !navigationState?.key) return

    const inAuthGroup = segments[0] === '(auth)'
    const isAuthenticated = Boolean(session.accessToken)

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
      return
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [navigationState?.key, router, segments, session.accessToken, storageReady])

  useEffect(() => {
    if (!storageReady || !session.accessToken || !session.userId) return
    void registerForPushNotifications()
  }, [session.accessToken, session.userId, storageReady])

  useEffect(() => {
    if (!storageReady || !navigationState?.key) return

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromNotification(router, {
        entityType: typeof response.notification.request.content.data?.entityType === 'string'
          ? response.notification.request.content.data.entityType
          : null,
        entityId: typeof response.notification.request.content.data?.entityId === 'string'
          ? response.notification.request.content.data.entityId
          : null,
      })
    })

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return

      routeFromNotification(router, {
        entityType: typeof response.notification.request.content.data?.entityType === 'string'
          ? response.notification.request.content.data.entityType
          : null,
        entityId: typeof response.notification.request.content.data?.entityId === 'string'
          ? response.notification.request.content.data.entityId
          : null,
      })
    })

    return () => subscription.remove()
  }, [navigationState?.key, router, storageReady])

  useEffect(() => {
    if (!storageReady || !session.accessToken) return
    void (async () => {
      await flushInspectionDraftSyncs()
      await flushInspectionMediaSyncs()
      await flushInspectionSubmitSyncs()
    })()
  }, [session.accessToken, storageReady])

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="inspection/[caseId]/[inspectionId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="case/[caseId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="comparable/[comparableId]"
          options={{ headerShown: false }}
        />
      </Stack>
      {!storageReady ? (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingTitle}>ValuCore Africa</Text>
          <Text style={styles.loadingSubtitle}>Restoring your session…</Text>
        </View>
      ) : null}
      <StatusBar style="auto" />
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
})
