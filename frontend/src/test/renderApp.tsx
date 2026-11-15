import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { App } from '@/app/App'
import { routes } from '@/app/routes'

/**
 * Mounts the real app (same providers, same routes) at a given URL.
 * A memory router replaces the browser history, and a fresh query client
 * keeps each test's cache isolated.
 */
export function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  return {
    user: userEvent.setup(),
    router,
    ...render(<App queryClient={queryClient} router={router} />),
  }
}
