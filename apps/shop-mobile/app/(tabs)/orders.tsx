import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../src/components/ui/Screen'
import { api } from '../../src/lib/api'
import { formatETB, formatDate } from '../../src/lib/format'
import { STATUS_COLOR } from '../../src/lib/status'
import { colors, radius, spacing } from '../../src/theme'

export default function Orders() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.orders.list(),
  })

  return (
    <Screen padded={false}>
      <Text style={styles.title}>My orders</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/orders/${item.id}`)}>
            <View style={styles.cardTop}>
              <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <View style={[styles.badge, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.dim}>
              {item.items?.length ?? 0} item(s) · {formatDate(item.scheduledFor)}
            </Text>
            <Text style={styles.total}>{formatETB(item.totalAmount)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No orders yet</Text> : null
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '700', padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderId: { color: colors.text, fontSize: 15, fontWeight: '700' },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: 13 },
  total: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 60 },
})
