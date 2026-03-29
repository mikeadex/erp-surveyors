import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { queryKeys, apiGet } from '@valuation-os/api'
import { useState } from 'react'

interface DashboardSummary {
  activeCases: number
  overdueCount: number
  pendingReview: number
  totalClients: number
}

export default function DashboardTab() {
  const [refreshing, setRefreshing] = useState(false)

  const { data, refetch } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => apiGet<DashboardSummary>('/api/v1/dashboard/summary'),
  })

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const stats = [
    { label: 'Active Cases', value: data?.activeCases ?? 0, color: '#2563eb' },
    { label: 'Overdue', value: data?.overdueCount ?? 0, color: '#dc2626' },
    { label: 'Pending Review', value: data?.pendingReview ?? 0, color: '#d97706' },
    { label: 'Clients', value: data?.totalClients ?? 0, color: '#16a34a' },
  ]

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">Overview</Text>
        <View className="flex-row flex-wrap gap-3">
          {stats.map((s) => (
            <View
              key={s.label}
              className="flex-1 min-w-[40%] bg-white rounded-xl border border-gray-200 p-4"
            >
              <Text className="text-sm text-gray-500">{s.label}</Text>
              <Text className="text-3xl font-bold mt-2" style={{ color: s.color }}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}
