import { Text } from 'react-native'
import { Screen } from '../../src/components/ui/Screen'
import { colors } from '../../src/theme'

export default function Profile() {
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Profile</Text>
      <Text style={{ color: colors.textDim, marginTop: 8 }}>Coming in wave 2F</Text>
    </Screen>
  )
}
