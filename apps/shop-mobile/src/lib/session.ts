import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'mela.accessToken'
const REFRESH_KEY = 'mela.refreshToken'

// Tokens are held in memory for synchronous access by the axios interceptor and
// mirrored to the OS secure store for persistence across launches.
let accessToken: string | null = null
let refreshToken: string | null = null

export const session = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,

  async set(access: string, refresh: string) {
    accessToken = access
    refreshToken = refresh
    await SecureStore.setItemAsync(ACCESS_KEY, access)
    await SecureStore.setItemAsync(REFRESH_KEY, refresh)
  },

  async clear() {
    accessToken = null
    refreshToken = null
    await SecureStore.deleteItemAsync(ACCESS_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
  },

  /** Load tokens from secure storage at startup. Returns true if signed in. */
  async hydrate(): Promise<boolean> {
    accessToken = await SecureStore.getItemAsync(ACCESS_KEY)
    refreshToken = await SecureStore.getItemAsync(REFRESH_KEY)
    return Boolean(accessToken)
  },
}
