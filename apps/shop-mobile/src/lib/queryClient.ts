import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // Long staleness so the catalog/orders stay usable offline.
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'mela-query-cache',
})
