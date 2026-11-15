import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/features/auth/AuthProvider'

type Router = Parameters<typeof RouterProvider>[0]['router']

interface AppProps {
  queryClient: QueryClient
  router: Router
}

/**
 * Providers, outermost first: server-state cache -> session -> routes.
 * The query client and router are injected so tests can pass their own.
 */
export function App({ queryClient, router }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
