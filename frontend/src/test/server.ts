import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { AuthResponse } from '@/lib/apiClient'

/**
 * MSW (Mock Service Worker) intercepts fetch at the network level. Components and the
 * apiClient run unchanged; only the "server" is fake. Each test can override a handler.
 */

export const demoUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'ana@example.com',
  fullName: 'Ana Pérez',
  followUpDays: 7,
}

export function authResponse(accessToken = 'access-token-1'): AuthResponse {
  return { accessToken, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), user: demoUser }
}

/** Default: there is no session (the refresh cookie is missing or expired). */
export const handlers = [
  http.post('*/api/auth/refresh', () => HttpResponse.json({ status: 401, title: 'Unauthorized' }, { status: 401 })),
  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
]

export const server = setupServer(...handlers)
