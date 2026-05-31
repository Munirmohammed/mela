import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Screen } from '../../src/components/ui/Screen'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { api } from '../../src/lib/api'
import { getErrorMessage } from '../../src/lib/apiError'
import { colors, spacing } from '../../src/theme'

export default function Login() {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const login = useMutation({
    mutationFn: () => api.auth.login(phone),
    onSuccess: () => router.push({ pathname: '/(auth)/otp', params: { phone } }),
    onError: (e) => setError(getErrorMessage(e)),
  })

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.logo}>{t('appName')}</Text>
        <Text style={styles.tagline}>{t('auth.welcome')}</Text>
        <Input
          label={t('auth.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+2519..."
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={t('auth.continue')}
          loading={login.isPending}
          onPress={() => {
            setError(null)
            login.mutate()
          }}
        />
        <Pressable onPress={() => router.push('/(auth)/register')} style={styles.linkWrap}>
          <Text style={styles.link}>New shop? Register</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: spacing.md },
  logo: { color: colors.brand, fontSize: 44, fontWeight: '800', textAlign: 'center' },
  tagline: { color: colors.textDim, fontSize: 16, textAlign: 'center', marginBottom: spacing.lg },
  error: { color: colors.danger, fontSize: 13 },
  linkWrap: { alignItems: 'center', marginTop: spacing.md },
  link: { color: colors.brand, fontSize: 14 },
})
