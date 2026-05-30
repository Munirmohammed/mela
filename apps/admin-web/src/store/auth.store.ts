import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  role: 'SHOP_OWNER' | 'DRIVER' | 'ADMIN' | null
  isAuthenticated: boolean
  setTokens: (access: string, refresh: string, role?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,
      setTokens: (access, refresh, role) =>
        set({ accessToken: access, refreshToken: refresh, role: role as any, isAuthenticated: true }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, role: null, isAuthenticated: false }),
    }),
    { name: 'mela-auth' }
  )
)
