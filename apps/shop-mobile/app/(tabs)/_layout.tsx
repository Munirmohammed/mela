import { Redirect, Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../src/store/auth.store'
import { colors } from '../../src/theme'

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { t } = useTranslation()

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders') }} />
      <Tabs.Screen name="wallet" options={{ title: t('tabs.wallet') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  )
}
