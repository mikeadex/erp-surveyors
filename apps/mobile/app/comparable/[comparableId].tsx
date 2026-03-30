import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@valuation-os/api'
import { formatDate } from '@valuation-os/utils'
import { richTextToPlainText } from '@/lib/rich-text'

interface ComparableDetailResponse {
  id: string
  comparableType: string
  address: string
  city: string | null
  state: string | null
  propertyUse: string | null
  tenureType: string | null
  transactionDate: string | null
  salePrice: string | null
  rentalValue: string | null
  plotSize: string | null
  plotSizeUnit: string | null
  buildingSize: string | null
  buildingSizeUnit: string | null
  pricePerSqm: string | null
  source: string | null
  sourceContact: string | null
  notes: string | null
  isVerified: boolean
  createdAt: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function MobileComparableDetailScreen() {
  const params = useLocalSearchParams<{ comparableId: string }>()
  const comparableId = Array.isArray(params.comparableId) ? params.comparableId[0] : params.comparableId

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: comparableId ? ['mobile-comparable-detail', comparableId] : ['mobile-comparable-detail-missing'],
    enabled: Boolean(comparableId),
    queryFn: () => apiGet<ComparableDetailResponse>(`/api/v1/comparables/${comparableId}`),
  })

  if (!comparableId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerTitle}>Comparable not found</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Comparable',
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { color: '#0f172a', fontWeight: '700' },
        }}
      />

      <View style={styles.container}>
        {isLoading || !data ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#0b6a38" />
            <Text style={styles.centerSubtitle}>Loading comparable…</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{data.comparableType}</Text>
                </View>
                {data.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.address}>{data.address}</Text>
              <Text style={styles.location}>
                {[data.city, data.state].filter(Boolean).join(', ') || 'No location details'}
              </Text>
            </View>

            <Section title="Pricing" description="Core valuation evidence values.">
              <Meta
                label="Sale Price"
                value={data.salePrice ? formatCurrency(Number(data.salePrice)) : 'Not recorded'}
              />
              <Meta
                label="Rental Value"
                value={data.rentalValue ? `${formatCurrency(Number(data.rentalValue))}/yr` : 'Not recorded'}
              />
              <Meta
                label="Rate / sqm"
                value={data.pricePerSqm ? `${formatCurrency(Number(data.pricePerSqm))}/sqm` : 'Not recorded'}
              />
              <Meta
                label="Transaction Date"
                value={data.transactionDate ? formatDate(data.transactionDate) : 'Not recorded'}
              />
            </Section>

            <Section title="Property Context" description="Use, tenure, and size context.">
              <Meta label="Property Use" value={data.propertyUse || 'Not recorded'} />
              <Meta label="Tenure" value={data.tenureType || 'Not recorded'} />
              <Meta
                label="Plot Size"
                value={data.plotSize ? `${data.plotSize} ${data.plotSizeUnit ?? 'sqm'}` : 'Not recorded'}
              />
              <Meta
                label="Building Size"
                value={data.buildingSize ? `${data.buildingSize} ${data.buildingSizeUnit ?? 'sqm'}` : 'Not recorded'}
              />
            </Section>

            <Section title="Source" description="Where this evidence came from.">
              <Meta label="Source" value={data.source || 'Not recorded'} />
              <Meta label="Source Contact" value={data.sourceContact || 'Not recorded'} />
              <Meta label="Added" value={formatDate(data.createdAt)} />
            </Section>

            {data.notes ? (
              <Section title="Notes" description="Supporting evidence notes and context.">
                <Text style={styles.noteText}>{richTextToPlainText(data.notes)}</Text>
              </Section>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
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
  stack: {
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'capitalize',
  },
  verifiedBadge: {
    borderRadius: 999,
    backgroundColor: '#ecfdf3',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  address: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  location: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
  },
  sectionContent: {
    marginTop: 14,
    gap: 12,
  },
  metaItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  centerState: {
    marginTop: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  centerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
})
