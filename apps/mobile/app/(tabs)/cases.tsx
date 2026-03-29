import { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        <Text style={styles.heading}>Cases</Text>

        <View style={styles.filtersRow}>
          {FILTERS.map((item) => {
            const active = item.value === filter
            return (
              <TouchableOpacity
                key={item.value}
                onPress={() => setFilter(item.value)}
                style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipIdle]}
              >
                <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : styles.filterChipTextIdle]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.list}>
          {data?.items.length ? (
            data.items.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardBody}>
                    <Text style={styles.reference}>{item.reference}</Text>
                    <Text style={styles.clientName}>{item.client.name}</Text>
                    <Text style={styles.address}>{item.property.address}</Text>
                  </View>
                  <View style={[styles.badge, item.isOverdue ? styles.badgeOverdue : styles.badgeDefault]}>
                    <Text style={[styles.badgeText, item.isOverdue ? styles.badgeTextOverdue : styles.badgeTextDefault]}>
                      {getCaseStageLabel(item.stage as never)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.metaText}>
                    Due {item.dueDate ? formatDate(item.dueDate) : 'Not set'}
                  </Text>
                  <Text style={styles.metaText}>{item.valuationType}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading cases…' : 'No cases found for this filter.'}
              </Text>
            </View>
          )}
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
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterChipIdle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterChipTextIdle: {
    color: '#475569',
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBody: {
    flex: 1,
    paddingRight: 12,
  },
  reference: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  clientName: {
    marginTop: 6,
    fontSize: 14,
    color: '#334155',
  },
  address: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  badgeDefault: {
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextOverdue: {
    color: '#b91c1c',
  },
  badgeTextDefault: {
    color: '#1d4ed8',
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
  },
})
