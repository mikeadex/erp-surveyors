import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>Alerts</Text>
            <Text style={styles.subheading}>
              {data?.unreadCount ?? 0} unread notification{(data?.unreadCount ?? 0) === 1 ? '' : 's'}
            </Text>
          </View>

          <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllButtonText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {data?.items.length ? (
            data.items.map((item) => (
              <View
                key={item.id}
                style={[styles.card, item.readAt ? styles.cardRead : styles.cardUnread]}
              >
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.body ? <Text style={styles.cardBody}>{item.body}</Text> : null}
                <Text style={styles.cardMeta}>{formatDateTime(item.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading alerts…' : 'No notifications yet.'}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  subheading: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },
  markAllButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  cardRead: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cardUnread: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  cardMeta: {
    marginTop: 10,
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
