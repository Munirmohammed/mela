import { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../../theme'

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
})
