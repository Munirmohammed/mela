import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, asyncStoragePersister } from '../src/lib/queryClient'
import { useAuthStore } from '../src/store/auth.store'
import { colors } from '../src/theme'
import '../src/lib/i18n'

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate)
  const hydrated = useAuthStore((s) => s.hydrated)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <StatusBar style="light" />
        <Slot />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
