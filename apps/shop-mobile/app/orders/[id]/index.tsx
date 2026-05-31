import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../../src/components/ui/Screen'
import { Button } from '../../../src/components/ui/Button'
import { api } from '../../../src/lib/api'
import { getErrorMessage } from '../../../src/lib/apiError'
import { formatETB, formatDate } from '../../../src/lib/format'
import { ORDER_STEPS, STATUS_COLOR } from '../../../src/lib/status'
import { colors, radius, spacing } from '../../../src/theme'

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.orders.getById(String(id)),
  })

  const cancel = useMutation({
    mutationFn: () => api.orders.cancel(String(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders'] })
      router.back()
    },
    onError: (e) => Alert.alert('Cannot cancel', getErrorMessage(e)),
  })

  if (isLoading || !order) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  const cancelled = order.status === 'CANCELLED'
  const currentStep = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number])
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED'
  const canTrack = Boolean(order.batchId) && (order.status === 'IN_TRANSIT' || order.status === 'CONFIRMED')

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>#{order.id.slice(-6).toUpperCase()}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Timeline */}
        <View style={styles.timeline}>
          {cancelled ? (
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Order cancelled</Text>
          ) : (
            ORDER_STEPS.map((step, i) => (
              <View key={step} style={styles.step}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: i <= currentStep ? STATUS_COLOR[step] : colors.muted },
                  ]}
                />
                <Text style={[styles.stepLabel, i <= currentStep && { color: colors.text }]}>{step}</Text>
              </View>
            ))
          )}
        </View>

        {canTrack ? <Button title="Track delivery" onPress={() => router.push(`/orders/${order.id}/track`)} /> : null}

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.section}>Items</Text>
          {order.items?.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {it.product?.nameAm ?? it.product?.name ?? 'Item'} × {it.quantity}
              </Text>
              <Text style={styles.dim}>{formatETB(it.unitPrice * it.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <View style={styles.itemRow}>
            <Text style={styles.dim}>Delivery fee</Text>
            <Text style={styles.dim}>{formatETB(order.deliveryFee)}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>{formatETB(order.totalAmount)}</Text>
          </View>
          <Text style={styles.dim}>
            {order.paymentMethod} · {order.paymentStatus} · scheduled {formatDate(order.scheduledFor)}
          </Text>
        </View>

        {canCancel ? (
          <Button
            title="Cancel order"
            variant="secondary"
            loading={cancel.isPending}
            onPress={() =>
              Alert.alert('Cancel order?', 'This cannot be undone.', [
                { text: 'Keep', style: 'cancel' },
                { text: 'Cancel order', style: 'destructive', onPress: () => cancel.mutate() },
              ])
            }
          />
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.brand, fontSize: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  step: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  stepLabel: { color: colors.textDim, fontSize: 9, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { color: colors.text, flex: 1 },
  dim: { color: colors.textDim, fontSize: 13 },
  totalLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  totalVal: { color: colors.brand, fontSize: 18, fontWeight: '800' },
})
