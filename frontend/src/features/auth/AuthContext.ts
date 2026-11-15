import { createContext, useContext } from 'react'
import type { User } from '@/lib/apiClient'
import type { LoginValues, RegisterValues } from './schemas'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  /** 'loading' while the app checks, on startup, whether the refresh cookie still gives a session. */
  status: AuthStatus
  user: User | null
  login: (values: LoginValues) => Promise<void>
  register: (values: RegisterValues) => Promise<void>
  logout: () => Promise<void>
  /** Lets the settings page update the cached profile after saving. */
  setUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.')
  }

  return context
}
