import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { refreshSession, setAccessToken, setSessionExpiredHandler, type AuthResponse, type User } from '@/lib/apiClient'
import { authApi } from './api'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'
import type { LoginValues, RegisterValues } from './schemas'

interface AuthState {
  status: AuthStatus
  user: User | null
}

/**
 * Holds "who is signed in" for the whole app (client state, via React context).
 * The access token itself stays inside apiClient; components only see the user.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })

  const signIn = useCallback((auth: AuthResponse) => {
    setAccessToken(auth.accessToken)
    setState({ status: 'authenticated', user: auth.user })
  }, [])

  const signOut = useCallback(() => {
    setAccessToken(null)
    // Drop every cached API response: the next user must never see this user's data.
    queryClient.clear()
    setState({ status: 'unauthenticated', user: null })
  }, [queryClient])

  // On startup the access token is gone (it only lived in memory), but the refresh cookie
  // may still be valid: try to restore the session before deciding to show the login page.
  useEffect(() => {
    let cancelled = false

    void refreshSession().then((auth) => {
      if (cancelled) {
        return
      }

      if (auth) {
        signIn(auth)
      } else {
        setState({ status: 'unauthenticated', user: null })
      }
    })

    return () => {
      cancelled = true
    }
  }, [signIn])

  // If a request later finds that the session cannot be refreshed, send the user to login.
  useEffect(() => {
    setSessionExpiredHandler(signOut)
    return () => setSessionExpiredHandler(null)
  }, [signOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      login: async (values: LoginValues) => signIn(await authApi.login(values)),
      register: async (values: RegisterValues) => signIn(await authApi.register(values)),
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          // Even if the request fails, forget the session locally.
          signOut()
        }
      },
      setUser: (user: User) => setState({ status: 'authenticated', user }),
    }),
    [state, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
