import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, Clock, Truck } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { ordersApi } from '@/api/endpoints'
import { useCartStore } from '@/store/cart.store'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { formatETB } from '@/lib/utils'

const PAYMENT_METHODS = [
  { value: 'CASH',  label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
  { value: 'CHAPA', label: 'Chapa / Telebirr',  icon: '📱', desc: 'Pay now via mobile money' },
  { value: 'CREDIT',label: 'Buy on Credit',     icon: '🏦', desc: 'Pay within 7 days (score ≥ 50)' },
]

const DELIVERY_FEE = 30

export default function CartPage() {
  const navigate = useNavigate()
  const { items, updateQty, removeItem, clear, total } = useCartStore()
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')

  const subtotal = total()
  const grandTotal = subtotal + DELIVERY_FEE

  const placeMutation = useMutation({
    mutationFn: () => ordersApi.place({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod,
      notes,
    }),
    onSuccess: ({ data }) => {
      clear()
      toast.success('Order placed successfully!')
      navigate(`/orders/${data.data.id}`)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to place order'),
  })

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-semibold text-white mb-2">Cart is empty</h2>
        <p className="text-gray-500 text-sm mb-6">Add products from the catalog</p>
        <Button onClick={() => navigate('/')}>Browse Catalog</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Delivery window notice */}
      <Card className="border-brand-500/20 bg-brand-500/5">
        <CardContent className="flex items-center gap-3 py-3">
          <Clock className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Order before 9PM</p>
            <p className="text-xs text-gray-500">Delivered tomorrow morning to your shop</p>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.productId}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="w-12 h-12 bg-surface-muted rounded-xl flex items-center justify-center flex-shrink-0">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                  : <span className="text-xl">📦</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                <p className="text-brand-400 text-sm">{formatETB(item.retailPrice)} / {item.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                  className="w-7 h-7 bg-surface-muted rounded-lg flex items-center justify-center hover:bg-surface-border transition-colors">
                  <Minus className="w-3 h-3 text-white" />
                </button>
                <span className="text-white font-medium text-sm w-5 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                  className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center hover:bg-brand-600 transition-colors">
                  <Plus className="w-3 h-3 text-white" />
                </button>
                <button onClick={() => removeItem(item.productId)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors ml-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment method */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">Payment Method</p>
        {PAYMENT_METHODS.map((pm) => (
          <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
              paymentMethod === pm.value
                ? 'border-brand-500/50 bg-brand-500/10'
                : 'border-surface-border bg-surface-card hover:border-surface-muted'
            }`}>
            <span className="text-xl">{pm.icon}</span>
            <div className="text-left">
              <p className="text-sm font-medium text-white">{pm.label}</p>
              <p className="text-xs text-gray-500">{pm.desc}</p>
            </div>
            <div className={`ml-auto w-4 h-4 rounded-full border-2 transition-colors ${
              paymentMethod === pm.value ? 'border-brand-500 bg-brand-500' : 'border-gray-600'
            }`} />
          </button>
        ))}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Notes (optional)</label>
        <textarea
          className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          rows={2}
          placeholder="Any special instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span><span>{formatETB(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Delivery</span>
            <span>{formatETB(DELIVERY_FEE)}</span>
          </div>
          <div className="border-t border-surface-border pt-2 flex justify-between font-semibold text-white">
            <span>Total</span><span className="text-brand-400">{formatETB(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" loading={placeMutation.isPending} onClick={() => placeMutation.mutate()}>
        Place Order — {formatETB(grandTotal)}
      </Button>
    </div>
  )
}
