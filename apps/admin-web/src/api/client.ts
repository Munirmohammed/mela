import { createMelaApi } from '@mela/api-client'
import { useAuthStore } from '@/store/auth.store'

/**
 * Shared Mela API client, wired to this app's Zustand auth store. The axios
 * instance + token-refresh logic now live in `@mela/api-client` so the mobile
 * apps reuse exactly the same behavior.
 */
export const melaApi = createMelaApi({
  baseURL: '/api/v1',
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokens: ({ accessToken, refreshToken }) =>
    useAuthStore.getState().setTokens(accessToken, refreshToken),
  onAuthFailure: () => {
    useAuthStore.getState().logout()
    window.location.href = '/auth'
  },
})

/** Back-compat raw axios instance used by `endpoints.ts` and existing pages. */
export const api = melaApi.raw
