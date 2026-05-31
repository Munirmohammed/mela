import { useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useMutation, onlineManager } from '@tanstack/react-query'
import { PAYMENT_METHODS, type Order, type PaymentMethod, type PlaceOrderInput } from '@mela/types'
import { Screen } from '../src/components/ui/Screen'
import { Button } from '../src/components/ui/Button'
import { useCartStore } from '../src/store/cart.store'
import { PLACE_ORDER_KEY } from '../src/lib/mutations'
import { formatETB } from '../src/lib/format'
import { colors, radius, spacing } from '../src/theme'

const DELIVERY_FEE = 30
const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash on delivery',
  CHAPA: 'Pay online (Chapa)',
  CREDIT: 'Buy on credit',
}

export default function Cart() {
  const items = useCartStore((s) => s.items)
  const setQty = useCartStore((s) => s.setQty)
  const total = useCartStore((s) => s.total())
  const clear = useCartStore((s) => s.clear)
  const [method, setMethod] = useState<PaymentMethod>('CASH')

  const placeOrder = useMutation<Order, Error, PlaceOrderInput>({
    mutationKey: PLACE_ORDER_KEY as unknown as string[],
  })

  function submit() {
    const payload: PlaceOrderInput = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod: method,
    }
    placeOrder.mutate(payload)
    clear()
    const online = onlineManager.isOnline()
    Alert.alert(
      online ? 'Order placed' : 'Order queued',
      online
        ? 'Your order has been placed and joins the next delivery batch.'
        : 'You are offline — your order will be sent automatically when you reconnect.',
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/orders') }]
    )
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Cart</Text>
        <View style={{ width: 50 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Your cart is empty</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => i.productId}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.nameAm}</Text>
                  <Text style={styles.dim}>{formatETB(item.retailPrice)} / {item.unit}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setQty(item.productId, item.quantity - 1)}>
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setQty(item.productId, item.quantity + 1)}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />

          <View style={styles.footer}>
            <Text style={styles.sectionLabel}>Payment method</Text>
            <View style={styles.methods}>
              {PAYMENT_METHODS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[styles.method, method === m && styles.methodActive]}
                >
                  <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                    {METHOD_LABELS[m]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.dim}>Subtotal</Text>
              <Text style={styles.summaryVal}>{formatETB(total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.dim}>Delivery</Text>
              <Text style={styles.summaryVal}>{formatETB(DELIVERY_FEE)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>{formatETB(total + DELIVERY_FEE)}</Text>
            </View>

            <Button title="Place order" onPress={submit} />
          </View>
        </>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.textDim, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  qty: { color: colors.text, fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: { color: colors.textDim, fontSize: 13 },
  methods: { gap: spacing.sm, marginBottom: spacing.sm },
  method: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodActive: { borderColor: colors.brand },
  methodText: { color: colors.textDim },
  methodTextActive: { color: colors.text, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryVal: { color: colors.text },
  totalLabel: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing.xs },
  totalVal: { color: colors.brand, fontSize: 18, fontWeight: '800', marginTop: spacing.xs },
})
