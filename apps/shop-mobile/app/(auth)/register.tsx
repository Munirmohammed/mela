import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { ZONES, ZONE_LABELS, type Zone } from '@mela/types'
import { Screen } from '../../src/components/ui/Screen'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { api } from '../../src/lib/api'
import { getErrorMessage } from '../../src/lib/apiError'
import { colors, radius, spacing } from '../../src/theme'

export default function Register() {
  const [form, setForm] = useState({ phone: '', ownerName: '', shopName: '', address: '' })
  const [zone, setZone] = useState<Zone>('BOLE')
  const [error, setError] = useState<string | null>(null)

  const register = useMutation({
    mutationFn: () => api.auth.register({ ...form, zone }),
    onSuccess: () => router.push({ pathname: '/(auth)/otp', params: { phone: form.phone } }),
    onError: (e) => setError(getErrorMessage(e)),
  })

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const canSubmit = form.phone && form.ownerName && form.shopName && form.address

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Register your shop</Text>
        <Input label="Phone number" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+2519..." />
        <Input label="Owner name" value={form.ownerName} onChangeText={set('ownerName')} />
        <Input label="Shop name" value={form.shopName} onChangeText={set('shopName')} />
        <Input label="Address" value={form.address} onChangeText={set('address')} />

        <Text style={styles.label}>Zone</Text>
        <View style={styles.chips}>
          {ZONES.map((z) => (
            <Pressable
              key={z}
              onPress={() => setZone(z)}
              style={[styles.chip, zone === z && styles.chipActive]}
            >
              <Text style={[styles.chipText, zone === z && styles.chipTextActive]}>{ZONE_LABELS[z]}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: spacing.lg }} />
        <Button
          title="Send code"
          loading={register.isPending}
          disabled={!canSubmit}
          onPress={() => {
            setError(null)
            register.mutate()
          }}
        />
        <Pressable onPress={() => router.back()} style={styles.linkWrap}>
          <Text style={styles.link}>Back to login</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: spacing.lg },
  label: { color: colors.textDim, fontSize: 13, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.textDim },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  linkWrap: { alignItems: 'center', marginTop: spacing.lg },
  link: { color: colors.brand, fontSize: 14 },
})
