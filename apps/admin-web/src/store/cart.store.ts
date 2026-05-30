import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  nameAm: string
  unit: string
  retailPrice: number
  quantity: number
  imageUrl?: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find((i) => i.productId === item.productId)
        if (existing) {
          set({ items: get().items.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
          )})
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }] })
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      updateQty: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.productId !== productId) })
        } else {
          set({ items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          )})
        }
      },
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.retailPrice * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'mela-cart' }
  )
)
