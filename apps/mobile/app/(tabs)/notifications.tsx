import { useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '@valuation-os/api'
import { formatDateTime } from '@valuation-os/utils'

interface NotificationsResponse {
  items: Array<{
    id: string
    type: string
    title: string
    body: string | null
    readAt: string | null
    createdAt: string
  }>
  unreadCount: number
}

export default function NotificationsTab() {
  const [refreshing, setRefreshing] = useState(false)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['mobile-notifications'],
    queryFn: () => apiGet<NotificationsResponse>('/api/v1/notifications'),
  })

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  async function markAllRead() {
    await apiPost('/api/v1/notifications/read-all')
    await refetch()
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4 space-y-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-semibold text-gray-900">Alerts</Text>
            <Text className="mt-1 text-sm text-gray-500">
              {data?.unreadCount ?? 0} unread notification{(data?.unreadCount ?? 0) === 1 ? '' : 's'}
            </Text>
          </View>

          <TouchableOpacity onPress={markAllRead} className="rounded-full bg-white px-3 py-2 border border-gray-200">
            <Text className="text-xs font-semibold text-gray-700">Mark all read</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-3">
          {data?.items.length ? (
            data.items.map((item) => (
              <View
                key={item.id}
                className={`rounded-2xl border p-4 ${item.readAt ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
              >
                <Text className="text-sm font-semibold text-gray-900">{item.title}</Text>
                {item.body ? <Text className="mt-1 text-sm text-gray-600">{item.body}</Text> : null}
                <Text className="mt-2 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10">
              <Text className="text-center text-sm text-gray-500">
                {isLoading ? 'Loading alerts…' : 'No notifications yet.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
