import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'

/** Drive React Query's online state from the device's real connectivity. */
export function setupOnlineManager() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected))
    })
  )
}
