import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './apiClient'

/**
 * TanStack Query owns "server state": data that lives in the API and is cached in the browser.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cached data is considered fresh for 30 seconds: no refetch when navigating back and forth.
        staleTime: 30_000,
        // Retry network hiccups and server errors once; never retry 4xx (the answer will not change).
        retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 1,
      },
    },
  })
}
