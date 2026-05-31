import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Screen } from '../../src/components/ui/Screen'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { api } from '../../src/lib/api'
import { getErrorMessage } from '../../src/lib/apiError'
import { useAuthStore } from '../../src/store/auth.store'
import { colors, spacing } from '../../src/theme'

export default function Otp() {
  const { t } = useTranslation()
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const signIn = useAuthStore((s) => s.signIn)

  const verify = useMutation({
    mutationFn: () => api.auth.verifyOtp({ phone: String(phone), code }),
    onSuccess: async (tokens) => {
      await signIn(tokens)
      router.replace('/(tabs)')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.title}>{t('auth.otp')}</Text>
        <Text style={styles.phone}>{phone}</Text>
        <Input
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="------"
          maxLength={6}
          autoFocus
          style={styles.codeInput}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={t('auth.verify')}
          loading={verify.isPending}
          disabled={code.length < 4}
          onPress={() => {
            setError(null)
            verify.mutate()
          }}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  phone: { color: colors.textDim, textAlign: 'center', marginBottom: spacing.lg },
  codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
})
