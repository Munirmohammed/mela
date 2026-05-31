import type { QueryClient } from '@tanstack/react-query'
import type { Order, PlaceOrderInput } from '@mela/types'
import { api } from './api'

export const PLACE_ORDER_KEY = ['placeOrder'] as const

/**
 * Register the order-placement mutation as a default keyed mutation. Because the
 * mutationFn lives here (not inline in a component), a mutation queued while
 * offline can be rehydrated from storage and resumed after a restart/reconnect.
 */
export function registerMutationDefaults(qc: QueryClient) {
  qc.setMutationDefaults(PLACE_ORDER_KEY as unknown as string[], {
    mutationFn: (vars) => api.orders.place(vars as unknown as PlaceOrderInput) as Promise<Order>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
