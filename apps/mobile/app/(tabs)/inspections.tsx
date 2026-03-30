import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@valuation-os/api'
import { formatDate } from '@valuation-os/utils'
import {
  listInspectionMediaSyncJobs,
  listInspectionSubmitSyncJobs,
  listInspectionSyncJobs,
} from '@/lib/storage'

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
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState<(typeof FILTERS)[number]['value']>(undefined)
  const [syncStateByInspection, setSyncStateByInspection] = useState<
    Record<string, { hasDraft: boolean; mediaCount: number; hasSubmit: boolean }>
  >({})

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
    await loadSyncState()
    setRefreshing(false)
  }

  const loadSyncState = useCallback(async () => {
    const [draftJobs, mediaJobs, submitJobs] = await Promise.all([
      listInspectionSyncJobs(),
      listInspectionMediaSyncJobs(),
      listInspectionSubmitSyncJobs(),
    ])

    const nextState: Record<string, { hasDraft: boolean; mediaCount: number; hasSubmit: boolean }> = {}

    for (const job of draftJobs) {
      nextState[job.inspectionId] = {
        ...(nextState[job.inspectionId] ?? { hasDraft: false, mediaCount: 0, hasSubmit: false }),
        hasDraft: true,
      }
    }

    for (const job of mediaJobs) {
      nextState[job.inspectionId] = {
        ...(nextState[job.inspectionId] ?? { hasDraft: false, mediaCount: 0, hasSubmit: false }),
        mediaCount: (nextState[job.inspectionId]?.mediaCount ?? 0) + 1,
      }
    }

    for (const job of submitJobs) {
      nextState[job.inspectionId] = {
        ...(nextState[job.inspectionId] ?? { hasDraft: false, mediaCount: 0, hasSubmit: false }),
        hasSubmit: true,
      }
    }

    setSyncStateByInspection(nextState)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadSyncState()
    }, [loadSyncState]),
  )

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
              <Pressable
                key={item.id}
                onPress={() => router.push(`/inspection/${item.case.id}/${item.id}`)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View>
                  {syncStateByInspection[item.id] ? (
                    <View style={styles.syncRow}>
                      {syncStateByInspection[item.id].hasDraft ? (
                        <View style={[styles.syncBadge, styles.syncBadgeNeutral]}>
                          <Text style={[styles.syncBadgeText, styles.syncBadgeTextNeutral]}>Draft queued</Text>
                        </View>
                      ) : null}
                      {syncStateByInspection[item.id].mediaCount > 0 ? (
                        <View style={[styles.syncBadge, styles.syncBadgeNeutral]}>
                          <Text style={[styles.syncBadgeText, styles.syncBadgeTextNeutral]}>
                            {syncStateByInspection[item.id].mediaCount} photo{syncStateByInspection[item.id].mediaCount === 1 ? '' : 's'} pending
                          </Text>
                        </View>
                      ) : null}
                      {syncStateByInspection[item.id].hasSubmit ? (
                        <View style={[styles.syncBadge, styles.syncBadgeAccent]}>
                          <Text style={[styles.syncBadgeText, styles.syncBadgeTextAccent]}>Submit queued</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
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
                  <Text style={styles.openHint}>Open inspection workspace</Text>
                </View>
              </Pressable>
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
    backgroundColor: '#0b6a38',
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
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.995 }],
  },
  syncRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  syncBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  syncBadgeNeutral: {
    backgroundColor: '#eff6ff',
  },
  syncBadgeAccent: {
    backgroundColor: '#ecfdf3',
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  syncBadgeTextNeutral: {
    color: '#1d4ed8',
  },
  syncBadgeTextAccent: {
    color: '#0b6a38',
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
  openHint: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#0b6a38',
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
