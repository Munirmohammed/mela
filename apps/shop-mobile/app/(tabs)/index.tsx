import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { CATEGORIES, CATEGORY_LABELS, type Category, type Product } from '@mela/types'
import { Screen } from '../../src/components/ui/Screen'
import { Input } from '../../src/components/ui/Input'
import { api } from '../../src/lib/api'
import { formatETB } from '../../src/lib/format'
import { useCartStore } from '../../src/store/cart.store'
import { colors, radius, spacing } from '../../src/theme'

type Filter = 'ALL' | Category

export default function Catalog() {
  const [category, setCategory] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const add = useCartStore((s) => s.add)
  const count = useCartStore((s) => s.count())
  const total = useCartStore((s) => s.total())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () =>
      api.products.list({
        category: category === 'ALL' ? undefined : category,
        search: search || undefined,
      }),
  })

  const filters: Filter[] = ['ALL', ...CATEGORIES]

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Input placeholder="Search products…" value={search} onChangeText={setSearch} style={styles.search} />
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCategory(item)}
              style={[styles.chip, category === item && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
                {item === 'ALL' ? 'All' : CATEGORY_LABELS[item]}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isError ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Couldn’t load products.</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={styles.link}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.grid}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => <ProductCard product={item} onAdd={() => add(toCartItem(item))} />}
          ListEmptyComponent={
            !isLoading ? <Text style={[styles.dim, { textAlign: 'center', marginTop: 40 }]}>No products</Text> : null
          }
        />
      )}

      {count > 0 ? (
        <Pressable style={styles.fab} onPress={() => router.push('/cart')}>
          <Text style={styles.fabText}>
            {count} item{count > 1 ? 's' : ''} · {formatETB(total)}
          </Text>
          <Text style={styles.fabCta}>View cart →</Text>
        </Pressable>
      ) : null}
    </Screen>
  )
}

function toCartItem(p: Product) {
  return {
    productId: p.id,
    name: p.name,
    nameAm: p.nameAm,
    unit: p.unit,
    retailPrice: p.retailPrice,
    minOrderQty: p.minOrderQty,
    imageUrl: p.imageUrl,
  }
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.nameAm} numberOfLines={1}>
        {product.nameAm}
      </Text>
      <Text style={styles.name} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.unit}>
        per {product.unit} · min {product.minOrderQty}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.price}>{formatETB(product.retailPrice)}</Text>
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  search: { marginBottom: spacing.sm },
  chips: { gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textDim, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  grid: { padding: spacing.lg, gap: spacing.md, paddingBottom: 96 },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  nameAm: { color: colors.text, fontSize: 15, fontWeight: '700' },
  name: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  unit: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  price: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dim: { color: colors.textDim },
  link: { color: colors.brand, fontWeight: '600' },
  fab: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fabText: { color: '#fff', fontWeight: '700' },
  fabCta: { color: '#fff', fontWeight: '700' },
})
