import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Screen } from '../../src/components/ui/Screen'
import { Card } from '../../src/components/ui/Card'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { api } from '../../src/lib/api'
import { getErrorMessage } from '../../src/lib/apiError'
import { registerForPush } from '../../src/lib/push'
import { useAuthStore } from '../../src/store/auth.store'
import { colors, radius, spacing } from '../../src/theme'

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'am', label: 'አማርኛ' },
  { code: 'en', label: 'English' },
]

export default function Profile() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const signOut = useAuthStore((s) => s.signOut)
  const [form, setForm] = useState({ shopName: '', ownerName: '', address: '' })
  const [dirty, setDirty] = useState(false)

  const shop = useQuery({ queryKey: ['shop', 'me'], queryFn: () => api.shop.me() })
  const loyalty = useQuery({ queryKey: ['loyalty'], queryFn: () => api.loyalty.get() })

  useEffect(() => {
    void registerForPush()
  }, [])

  useEffect(() => {
    if (shop.data && !dirty) {
      setForm({
        shopName: shop.data.shopName ?? '',
        ownerName: shop.data.ownerName ?? '',
        address: shop.data.address ?? '',
      })
    }
  }, [shop.data, dirty])

  const save = useMutation({
    mutationFn: () => api.shop.update(form),
    onSuccess: () => {
      setDirty(false)
      void qc.invalidateQueries({ queryKey: ['shop', 'me'] })
      Alert.alert('Saved', 'Your profile has been updated.')
    },
    onError: (e) => Alert.alert('Save failed', getErrorMessage(e)),
  })

  const set = (k: keyof typeof form) => (v: string) => {
    setDirty(true)
    setForm((f) => ({ ...f, [k]: v }))
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>{t('tabs.profile')}</Text>

        {/* Loyalty */}
        <Card>
          <Text style={styles.section}>Mela Points</Text>
          <Text style={styles.points}>{loyalty.data?.points ?? 0}</Text>
          <Text style={styles.tier}>{loyalty.data?.tier ?? 'BRONZE'} tier</Text>
        </Card>

        {/* Shop profile */}
        <Card>
          <Text style={styles.section}>Shop details</Text>
          <Input label="Shop name" value={form.shopName} onChangeText={set('shopName')} />
          <Input label="Owner name" value={form.ownerName} onChangeText={set('ownerName')} />
          <Input label="Address" value={form.address} onChangeText={set('address')} />
          <Text style={styles.dim}>
            Zone: {shop.data?.zone ?? '—'} · {shop.data?.isVerified ? 'Verified' : 'Pending verification'}
          </Text>
          <View style={{ height: spacing.sm }} />
          <Button title="Save changes" loading={save.isPending} disabled={!dirty} onPress={() => save.mutate()} />
        </Card>

        {/* Language */}
        <Card>
          <Text style={styles.section}>Language</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => i18n.changeLanguage(l.code)}
                style={[styles.lang, i18n.language === l.code && styles.langActive]}
              >
                <Text style={[styles.langText, i18n.language === l.code && styles.langTextActive]}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Button
          title="Log out"
          variant="secondary"
          onPress={() =>
            Alert.alert('Log out?', '', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log out',
                style: 'destructive',
                onPress: async () => {
                  await signOut()
                  router.replace('/(auth)/login')
                },
              },
            ])
          }
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  dim: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs },
  points: { color: colors.brand, fontSize: 36, fontWeight: '800' },
  tier: { color: colors.textDim, fontSize: 14 },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  lang: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langActive: { borderColor: colors.brand },
  langText: { color: colors.textDim },
  langTextActive: { color: colors.text, fontWeight: '700' },
})
