import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setApiAuth, setApiBaseUrl } from '@valuation-os/api'
import { clearSession, getAccessToken, getRefreshToken, setSessionTokens } from '@/lib/storage'

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
  useEffect(() => {
    setApiBaseUrl(API_BASE_URL)
    setApiAuth({
      getAccessToken,
      getRefreshToken,
      setTokens: setSessionTokens,
      clearTokens: clearSession,
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </QueryClientProvider>
  )
}
