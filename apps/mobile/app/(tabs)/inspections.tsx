import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        <Text style={styles.heading}>Inspections</Text>

        <View style={styles.filtersRow}>
          {FILTERS.map((item) => {
            const active = item.value === status
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => setStatus(item.value)}
                style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipIdle]}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : styles.filterTextIdle]}>
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
                  <Text style={styles.reference}>{item.case.reference}</Text>
                  <View style={[styles.badge, item.status === 'submitted' ? styles.badgeSubmitted : styles.badgeDraft]}>
                    <Text style={[styles.badgeText, item.status === 'submitted' ? styles.badgeTextSubmitted : styles.badgeTextDraft]}>
                      {item.status === 'submitted' ? 'Submitted' : 'Draft'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.metaLine}>
                  Inspector: {item.inspector.firstName} {item.inspector.lastName}
                </Text>
                <Text style={styles.subMeta}>
                  Inspection date: {item.inspectionDate ? formatDate(item.inspectionDate) : 'Not scheduled'}
                </Text>
                <Text style={styles.subMeta}>
                  Submitted: {item.submittedAt ? formatDate(item.submittedAt) : 'Not yet'}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading inspections…' : 'No inspections found.'}
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
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  filterTextIdle: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reference: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeSubmitted: {
    backgroundColor: '#dcfce7',
  },
  badgeDraft: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextSubmitted: {
    color: '#15803d',
  },
  badgeTextDraft: {
    color: '#b45309',
  },
  metaLine: {
    marginTop: 12,
    fontSize: 14,
    color: '#334155',
  },
  subMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
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
