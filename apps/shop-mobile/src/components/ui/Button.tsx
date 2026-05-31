import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'
import { colors, radius, spacing } from '../../theme'

interface Props extends Omit<PressableProps, 'children'> {
  title: string
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const isDisabled = Boolean(disabled || loading)
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.brand} />
      ) : (
        <Text style={[styles.text, variant !== 'primary' && { color: colors.brand }]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
