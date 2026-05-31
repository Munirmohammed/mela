import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { api } from './api'

/**
 * Request notification permission, get the Expo push token, and register it with
 * the API. Fully best-effort — any failure (denied permission, no projectId in
 * dev, etc.) is swallowed so it never blocks the app.
 */
export async function registerForPush(): Promise<void> {
  try {
    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync()
      status = requested.status
    }
    if (status !== 'granted') return
    const tokenData = await Notifications.getExpoPushTokenAsync()
    await api.devices.register(tokenData.data, Platform.OS)
  } catch {
    /* ignore — push is optional */
  }
}
