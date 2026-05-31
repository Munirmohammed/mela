import { Text } from 'react-native'
import { Screen } from '../../src/components/ui/Screen'
import { colors } from '../../src/theme'

// Catalog is built in wave 2C.
export default function Home() {
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Catalog</Text>
      <Text style={{ color: colors.textDim, marginTop: 8 }}>Coming in wave 2C</Text>
    </Screen>
  )
}
