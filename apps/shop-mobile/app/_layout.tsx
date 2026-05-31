import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { onlineManager } from '@tanstack/react-query'
import { queryClient, asyncStoragePersister } from '../src/lib/queryClient'
import { setupOnlineManager } from '../src/lib/online'
import { registerMutationDefaults } from '../src/lib/mutations'
import { useAuthStore } from '../src/store/auth.store'
import { OfflineBanner } from '../src/components/OfflineBanner'
import { colors } from '../src/theme'
import '../src/lib/i18n'

// One-time setup: connectivity tracking, offline order mutation defaults, and
// resuming any queued orders as soon as connectivity returns.
setupOnlineManager()
registerMutationDefaults(queryClient)
onlineManager.subscribe(() => {
  if (onlineManager.isOnline()) void queryClient.resumePausedMutations()
})

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
        onSuccess={() => {
          // Resume orders that were queued offline before this launch.
          void queryClient.resumePausedMutations()
        }}
      >
        <StatusBar style="light" />
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }} />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  )
}
