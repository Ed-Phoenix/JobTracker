import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setAccessToken } from '@/lib/apiClient'
import { server } from './server'

// jsdom has no layout engine and no ResizeObserver, which Recharts' ResponsiveContainer needs.
// A no-op stub lets the charts mount (at zero size); tests read values from the table view instead.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Fail loudly if a component calls an endpoint the test did not mock.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  setAccessToken(null)
})

afterAll(() => server.close())
