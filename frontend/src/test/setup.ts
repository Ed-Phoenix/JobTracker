import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setAccessToken } from '@/lib/apiClient'
import { server } from './server'

// findBy*/waitFor give up after 1 s by default. Pages are lazy-loaded routes, so the first test that
// visits one also pays for importing it (the dashboard pulls in the chart library): ~1 s locally and
// more on a cold CI runner. A longer limit only matters when something is slow; passing tests still
// finish as soon as the element appears.
configure({ asyncUtilTimeout: 5000 })

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
