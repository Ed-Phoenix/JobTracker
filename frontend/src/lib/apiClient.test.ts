import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { authResponse, server } from '@/test/server'
import { api, ApiError, fileNameFrom, setAccessToken, setSessionExpiredHandler } from './apiClient'

describe('apiClient', () => {
  it('sends the access token as a Bearer header', async () => {
    let authorization: string | null = null
    server.use(
      http.get('*/api/ping', ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    setAccessToken('my-token')

    await api.get('/ping')

    expect(authorization).toBe('Bearer my-token')
  })

  it('refreshes once on 401 and retries the request with the new token', async () => {
    server.use(
      http.get('*/api/ping', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh-token'
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 }),
      ),
      http.post('*/api/auth/refresh', () => HttpResponse.json(authResponse('fresh-token'))),
    )
    setAccessToken('expired-token')

    await expect(api.get('/ping')).resolves.toEqual({ ok: true })
  })

  it('shares a single refresh call between requests that fail at the same time', async () => {
    let refreshCalls = 0
    server.use(
      http.get('*/api/ping', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh-token'
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 }),
      ),
      http.post('*/api/auth/refresh', () => {
        refreshCalls++
        return HttpResponse.json(authResponse('fresh-token'))
      }),
    )
    setAccessToken('expired-token')

    await Promise.all([api.get('/ping'), api.get('/ping'), api.get('/ping')])

    // Refresh tokens rotate: three refresh calls would make the API detect "reuse" and end the session.
    expect(refreshCalls).toBe(1)
  })

  it('notifies the session-expired handler when the refresh also fails', async () => {
    server.use(http.get('*/api/ping', () => new HttpResponse(null, { status: 401 })))
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)

    await expect(api.get('/ping')).rejects.toBeInstanceOf(ApiError)
    expect(onExpired).toHaveBeenCalledOnce()

    setSessionExpiredHandler(null)
  })

  it('does not try to refresh when the caller disables it (login with wrong password)', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ status: 401, detail: 'Invalid email or password.' }, { status: 401 }),
      ),
      http.post('*/api/auth/refresh', () => {
        refreshCalls++
        return new HttpResponse(null, { status: 401 })
      }),
    )

    const error = await api.post('/auth/login', {}, { retryOnUnauthorized: false }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Invalid email or password.')
    expect(refreshCalls).toBe(0)
  })

  it('exposes ProblemDetails field errors', async () => {
    server.use(
      http.post('*/api/things', () =>
        HttpResponse.json({ status: 400, errors: { email: ['Email is invalid.'] } }, { status: 400 }),
      ),
    )

    const error = (await api.post('/things', {}).catch((e: unknown) => e)) as ApiError

    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({ email: ['Email is invalid.'] })
  })

  it('returns undefined for 204 No Content', async () => {
    server.use(http.delete('*/api/things/1', () => new HttpResponse(null, { status: 204 })))

    await expect(api.delete('/things/1')).resolves.toBeUndefined()
  })
})

describe('fileNameFrom', () => {
  it('prefers the UTF-8 encoded name, which supports accents', () => {
    expect(fileNameFrom("attachment; filename=reporte.csv; filename*=UTF-8''reporte-ma%C3%B1ana.csv")).toBe('reporte-mañana.csv')
  })

  it('falls back to the plain name, quoted or not', () => {
    expect(fileNameFrom('attachment; filename="export.xlsx"')).toBe('export.xlsx')
    expect(fileNameFrom('attachment; filename=export.csv')).toBe('export.csv')
  })

  it('returns null without a header', () => {
    expect(fileNameFrom(null)).toBeNull()
  })
})
