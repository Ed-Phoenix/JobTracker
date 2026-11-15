import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setAccessToken } from '@/lib/apiClient'
import { server } from './server'

// Fail loudly if a component calls an endpoint the test did not mock.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  setAccessToken(null)
})

afterAll(() => server.close())
