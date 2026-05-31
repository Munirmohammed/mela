import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Screen } from '../../src/components/ui/Screen'
import { colors, spacing } from '../../src/theme'

// Placeholder — the full phone + OTP flow is built in wave 2B.
export default function Login() {
  const { t } = useTranslation()
  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.logo}>{t('appName')}</Text>
        <Text style={styles.tagline}>{t('auth.welcome')}</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  logo: { color: colors.brand, fontSize: 48, fontWeight: '800' },
  tagline: { color: colors.textDim, fontSize: 16 },
})
