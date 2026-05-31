import { create } from 'zustand'
import type { AuthTokens, Role } from '@mela/types'
import { session } from '../lib/session'

interface AuthState {
  isAuthenticated: boolean
  role: Role | null
  hydrated: boolean
  hydrate: () => Promise<void>
  signIn: (tokens: AuthTokens) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  hydrated: false,

  async hydrate() {
    const ok = await session.hydrate()
    set({ isAuthenticated: ok, hydrated: true })
  },

  async signIn(tokens) {
    await session.set(tokens.accessToken, tokens.refreshToken)
    set({ isAuthenticated: true, role: tokens.role })
  },

  async signOut() {
    await session.clear()
    set({ isAuthenticated: false, role: null })
  },
}))
