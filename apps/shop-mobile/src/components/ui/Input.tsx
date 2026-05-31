import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, radius, spacing } from '../../theme'

interface Props extends TextInputProps {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, marginBottom: spacing.md },
  label: { color: colors.textDim, fontSize: 13 },
  input: {
    height: 50,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
})
