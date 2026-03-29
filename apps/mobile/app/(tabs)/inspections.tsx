import { useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@valuation-os/api'
import { formatDate } from '@valuation-os/utils'

interface InspectionsResponse {
  items: Array<{
    id: string
    status: 'draft' | 'submitted'
    inspectionDate: string | null
    submittedAt: string | null
    case: { id: string; reference: string; stage: string }
    inspector: { id: string; firstName: string; lastName: string }
  }>
}

const FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
] as const

export default function InspectionsTab() {
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState<(typeof FILTERS)[number]['value']>(undefined)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['mobile-inspections', status ?? 'all'],
    queryFn: () =>
      apiGet<InspectionsResponse>('/api/v1/inspections', {
        ...(status ? { status } : {}),
      }),
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
        <Text className="text-lg font-semibold text-gray-900">Inspections</Text>

        <View className="flex-row gap-2">
          {FILTERS.map((item) => {
            const active = item.value === status
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => setStatus(item.value)}
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
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-gray-900">{item.case.reference}</Text>
                  <View className={`rounded-full px-2.5 py-1 ${item.status === 'submitted' ? 'bg-green-100' : 'bg-amber-100'}`}>
                    <Text className={`text-[10px] font-semibold ${item.status === 'submitted' ? 'text-green-700' : 'text-amber-700'}`}>
                      {item.status === 'submitted' ? 'Submitted' : 'Draft'}
                    </Text>
                  </View>
                </View>

                <Text className="mt-2 text-sm text-gray-600">
                  Inspector: {item.inspector.firstName} {item.inspector.lastName}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Inspection date: {item.inspectionDate ? formatDate(item.inspectionDate) : 'Not scheduled'}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Submitted: {item.submittedAt ? formatDate(item.submittedAt) : 'Not yet'}
                </Text>
              </View>
            ))
          ) : (
            <View className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-10">
              <Text className="text-center text-sm text-gray-500">
                {isLoading ? 'Loading inspections…' : 'No inspections found.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
