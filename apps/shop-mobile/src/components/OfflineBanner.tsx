import { useNetInfo } from '@react-native-community/netinfo'
import { StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing } from '../theme'

export function OfflineBanner() {
  const net = useNetInfo()
  const { t } = useTranslation()
  if (net.isConnected !== false) return null
  return <Text style={styles.banner}>{t('common.offline')}</Text>
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    color: '#000',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    fontSize: 12,
    fontWeight: '600',
  },
})
