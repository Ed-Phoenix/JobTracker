import { api, type AuthResponse } from '@/lib/apiClient'
import type { LoginValues, RegisterValues } from './schemas'

// A 401 from these endpoints means "wrong credentials", so the client must not try to refresh.
const noRetry = { retryOnUnauthorized: false }

export const authApi = {
  login: (values: LoginValues) => api.post<AuthResponse>('/auth/login', values, noRetry),

  register: ({ fullName, email, password }: RegisterValues) =>
    api.post<AuthResponse>('/auth/register', { fullName, email, password }, noRetry),

  logout: () => api.post<void>('/auth/logout', undefined, noRetry),
}
