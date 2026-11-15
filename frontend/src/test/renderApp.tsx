import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter } from 'react-router'
import { App } from '@/app/App'
import { routes } from '@/app/routes'
import { authResponse, server } from './server'

interface RenderAppOptions {
  /** Starts with a valid session (the refresh call on startup succeeds). */
  authenticated?: boolean
}

/**
 * Mounts the real app (same providers, same routes) at a given URL.
 * A memory router replaces the browser history, and a fresh query client
 * keeps each test's cache isolated.
 */
export function renderApp(initialPath = '/', { authenticated = false }: RenderAppOptions = {}) {
  if (authenticated) {
    server.use(http.post('*/api/auth/refresh', () => HttpResponse.json(authResponse())))
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  return {
    user: userEvent.setup(),
    router,
    queryClient,
    ...render(<App queryClient={queryClient} router={router} />),
  }
}
