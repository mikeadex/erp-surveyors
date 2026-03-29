import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { apiGet, queryKeys } from '@valuation-os/api'
import { formatDate, getCaseStageLabel } from '@valuation-os/utils'

interface CasesResponse {
  items: Array<{
    id: string
    reference: string
    stage: string
    valuationType: string
    isOverdue: boolean
    dueDate: string | null
    client: { id: string; name: string; type: string }
    property: { id: string; address: string; localGovernment: string | null; state: string }
  }>
}

const FILTERS = [
  { label: 'Assigned', value: 'assigned' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Review', value: 'review' },
] as const

export default function CasesTab() {
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('assigned')

  const params = useMemo(() => {
    if (filter === 'overdue') return { isOverdue: true }
    if (filter === 'review') return { stage: 'review' }
    return { assignedToMe: true }
  }, [filter])

  const { data, refetch, isLoading } = useQuery({
    queryKey: queryKeys.cases.all('mobile', params),
    queryFn: () => apiGet<CasesResponse>('/api/v1/cases', params),
  })

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4 space-y-4">
        <Text className="text-lg font-semibold text-gray-900">Cases</Text>

        <View className="flex-row gap-2">
          {FILTERS.map((item) => {
            const active = item.value === filter
            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setFilter(item.value)}
                className={`rounded-full px-3 py-2 ${active ? 'bg-blue-600' : 'bg-white border border-gray-200'}`}
              >
                <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View className="space-y-3">
          {data?.items.length ? (
            data.items.map((item) => (
              <View key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-gray-900">{item.reference}</Text>
                    <Text className="mt-1 text-sm text-gray-600">{item.client.name}</Text>
                    <Text className="mt-1 text-sm text-gray-500">{item.property.address}</Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${item.isOverdue ? 'bg-red-100' : 'bg-blue-50'}`}>
                    <Text className={`text-[10px] font-semibold ${item.isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
                      {getCaseStageLabel(item.stage as never)}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row justify-between">
                  <Text className="text-xs text-gray-500">
                    Due {item.dueDate ? formatDate(item.dueDate) : 'Not set'}
                  </Text>
                  <Text className="text-xs text-gray-500 capitalize">{item.valuationType}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10">
              <Text className="text-center text-sm text-gray-500">
                {isLoading ? 'Loading cases…' : 'No cases found for this filter.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
