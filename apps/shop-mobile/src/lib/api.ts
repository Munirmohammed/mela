import { createMelaApi } from '@mela/api-client'
import { session } from './session'
import { useAuthStore } from '../store/auth.store'

// In dev, point EXPO_PUBLIC_API_URL at your machine's LAN IP (e.g.
// http://192.168.1.10:3000/api/v1) so the phone can reach the API.
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export const api = createMelaApi({
  baseURL,
  getAccessToken: () => session.getAccess(),
  getRefreshToken: () => session.getRefresh(),
  onTokens: (tokens) => {
    // Fire-and-forget secure persistence; the in-memory copy is already updated.
    void session.set(tokens.accessToken, tokens.refreshToken)
  },
  onAuthFailure: () => {
    void useAuthStore.getState().signOut()
  },
})
