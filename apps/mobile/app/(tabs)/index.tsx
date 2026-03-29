import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
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
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        <Text style={styles.heading}>Overview</Text>
        <View style={styles.grid}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={styles.card}
            >
              <Text style={styles.cardLabel}>{s.label}</Text>
              <Text style={[styles.cardValue, { color: s.color }]}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    minWidth: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  cardLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  cardValue: {
    marginTop: 10,
    fontSize: 34,
    fontWeight: '700',
  },
})
