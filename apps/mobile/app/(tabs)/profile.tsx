import { useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { apiGet, apiPost, queryKeys } from '@valuation-os/api'
import { formatDateTime, ROLE_LABELS } from '@valuation-os/utils'
import { clearSession } from '@/lib/storage'

interface MeResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  role: keyof typeof ROLE_LABELS
  phone: string | null
  lastLoginAt: string | null
  firm: {
    id: string
    name: string
    slug: string
  }
}

export default function ProfileTab() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const { data, refetch, isLoading } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => apiGet<MeResponse>('/api/v1/auth/me'),
  })

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  async function signOut() {
    setIsSigningOut(true)
    try {
      await apiPost('/api/v1/auth/logout')
    } finally {
      clearSession()
      router.replace('/(auth)/login')
      setIsSigningOut(false)
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4 space-y-4">
        <Text className="text-lg font-semibold text-gray-900">Profile</Text>

        {data ? (
          <>
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-xl font-semibold text-gray-900">
                {data.firstName} {data.lastName}
              </Text>
              <Text className="mt-1 text-sm text-gray-500">{data.email}</Text>
              <Text className="mt-3 text-sm text-gray-700">{ROLE_LABELS[data.role]}</Text>
              <Text className="mt-1 text-sm text-gray-700">{data.firm.name}</Text>
            </View>

            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-sm font-semibold text-gray-900">Account details</Text>
              <Text className="mt-3 text-sm text-gray-600">
                Phone: {data.phone ?? 'Not set'}
              </Text>
              <Text className="mt-2 text-sm text-gray-600">
                Firm URL: valuationos.app/{data.firm.slug}
              </Text>
              <Text className="mt-2 text-sm text-gray-600">
                Last login: {formatDateTime(data.lastLoginAt)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={signOut}
              disabled={isSigningOut}
              className="rounded-2xl bg-red-600 px-4 py-3 items-center"
            >
              <Text className="text-sm font-semibold text-white">
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10">
            <Text className="text-center text-sm text-gray-500">
              {isLoading ? 'Loading profile…' : 'Unable to load your profile.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
