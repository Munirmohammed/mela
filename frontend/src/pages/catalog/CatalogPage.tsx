import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Minus, ShoppingCart } from 'lucide-react'
import { productsApi } from '@/api/endpoints'
import { useCartStore } from '@/store/cart.store'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { formatETB } from '@/lib/utils'
import { Link } from 'react-router-dom'

const CATEGORIES = ['ALL', 'GRAINS', 'OILS_FATS', 'CLEANING', 'BEVERAGES', 'DAIRY', 'SPICES', 'SNACKS']
const CAT_LABELS: Record<string, string> = {
  ALL: 'All', GRAINS: '🌾 Grains', OILS_FATS: '🫙 Oils', CLEANING: '🧼 Cleaning',
  BEVERAGES: '☕ Drinks', DAIRY: '🥛 Dairy', SPICES: '🌶 Spices', SNACKS: '🍪 Snacks',
}

export default function CatalogPage() {
  const [category, setCategory] = useState('ALL')
  const [search, setSearch] = useState('')
  const { addItem, items, updateQty } = useCartStore()

  const { data, isLoading } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () => productsApi.list({
      ...(category !== 'ALL' && { category }),
      ...(search && { search }),
    }).then((r) => r.data.data),
  })

  const getCartQty = (productId: string) =>
    items.find((i) => i.productId === productId)?.quantity || 0

  const cartCount = useCartStore((s) => s.count())

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <Input
        placeholder="Search products... / ምርቶችን ፈልግ"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search className="w-4 h-4" />}
      />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category === cat
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'bg-surface-card border border-surface-border text-gray-400 hover:text-white'
            }`}
          >
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-card border border-surface-border rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {data?.map((product: any) => {
            const qty = getCartQty(product.id)
            return (
              <Card key={product.id} className="overflow-hidden">
                {/* Product image */}
                <div className="h-28 bg-surface-muted flex items-center justify-center relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{CAT_LABELS[product.category]?.split(' ')[0] || '📦'}</span>
                  )}
                  <span className="absolute top-2 right-2 bg-surface/80 backdrop-blur text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full">
                    {product.unit}
                  </span>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">{product.name}</p>
                    <p className="text-gray-500 text-xs">{product.nameAm}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-400 font-semibold text-sm">{formatETB(product.retailPrice)}</p>
                      <p className="text-gray-600 text-[10px]">min {product.minOrderQty} {product.unit}</p>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => {
                          addItem({ productId: product.id, name: product.name, nameAm: product.nameAm, unit: product.unit, retailPrice: product.retailPrice, imageUrl: product.imageUrl })
                          toast.success(`${product.name} added`)
                        }}
                        className="w-8 h-8 bg-brand-500 hover:bg-brand-600 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-brand-500/25"
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(product.id, qty - 1)}
                          className="w-7 h-7 bg-surface-muted rounded-lg flex items-center justify-center hover:bg-surface-border transition-colors">
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="text-white font-medium text-sm w-5 text-center">{qty}</span>
                        <button onClick={() => updateQty(product.id, qty + 1)}
                          className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center hover:bg-brand-600 transition-colors">
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && (
        <Link to="/cart" className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 md:bottom-6">
          <Button size="lg" className="shadow-2xl shadow-brand-500/40 px-8">
            <ShoppingCart className="w-4 h-4" />
            View Cart ({cartCount} items)
          </Button>
        </Link>
      )}
    </div>
  )
}
