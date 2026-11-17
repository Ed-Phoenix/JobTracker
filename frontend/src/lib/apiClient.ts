/**
 * Thin wrapper around fetch for the JobTracker API.
 *
 * - The access token lives only in this module's memory (never in localStorage),
 *   so a script injected through XSS cannot read it from storage.
 * - The refresh token is an HttpOnly cookie the browser sends by itself to /api/auth.
 * - When a request gets 401, the client refreshes the session once and retries.
 */

/** Error body returned by the API (RFC 9457 ProblemDetails). */
export interface ProblemDetails {
  title?: string
  status?: number
  detail?: string
  /** Present on 400 validation errors: field name -> messages. */
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails | null

  constructor(status: number, problem: ProblemDetails | null) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  get fieldErrors(): Record<string, string[]> {
    return this.problem?.errors ?? {}
  }
}

export interface User {
  id: string
  email: string
  fullName: string
  followUpDays: number
}

export interface AuthResponse {
  accessToken: string
  expiresAt: string
  user: User
}

// Absolute URL so the same code works in the browser and in tests (Node's fetch needs one).
const baseUrl = () => `${window.location.origin}/api`

let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** The auth provider registers this to react when the session can no longer be refreshed. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

let refreshInFlight: Promise<AuthResponse | null> | null = null

/**
 * Asks the API for a new access token using the refresh cookie.
 * Single-flight: if several requests fail with 401 at the same time, they all wait for
 * the same refresh call. This matters because refresh tokens rotate: a second call with
 * the old cookie would look like token theft and close the session.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${baseUrl()}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
      if (!response.ok) {
        accessToken = null
        return null
      }

      const auth = (await response.json()) as AuthResponse
      accessToken = auth.accessToken
      return auth
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** False for login/register: a 401 there means "wrong credentials", not "expired session". */
  retryOnUnauthorized?: boolean
  /** "file" returns the body as a Blob plus the file name the server suggested. */
  responseType?: 'json' | 'file'
}

/** A file returned by the API, e.g. an export. */
export interface DownloadedFile {
  blob: Blob
  fileName: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, retryOnUnauthorized = true, responseType = 'json' } = options

  const headers: Record<string, string> = { Accept: responseType === 'file' ? '*/*' : 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    signal,
  })

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshSession()
    if (refreshed) {
      return request<T>(path, { ...options, retryOnUnauthorized: false })
    }

    onSessionExpired?.()
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response))
  }

  // 204 No Content (e.g. logout, delete) has no body to parse.
  if (response.status === 204) {
    return undefined as T
  }

  if (responseType === 'file') {
    const file: DownloadedFile = {
      blob: await response.blob(),
      fileName: fileNameFrom(response.headers.get('Content-Disposition')) ?? 'download',
    }
    return file as T
  }

  return (await response.json()) as T
}

/**
 * Reads the name from Content-Disposition. ASP.NET Core sends both forms:
 * filename="x.csv" and filename*=UTF-8''x.csv (the encoded one supports accents, so it wins).
 */
export function fileNameFrom(header: string | null): string | null {
  if (!header) return null

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded) return decodeURIComponent(encoded[1])

  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : null
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    return (await response.json()) as ProblemDetails
  } catch {
    return null
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  /**
   * GET that returns a file. A plain <a href> cannot be used for downloads here: the browser
   * would not send the access token, which lives in memory and travels in the Authorization header.
   */
  download: (path: string) => request<DownloadedFile>(path, { responseType: 'file' }),
  post: <T>(path: string, body?: unknown, options?: Pick<RequestOptions, 'retryOnUnauthorized'>) =>
    request<T>(path, { method: 'POST', body, ...options }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}
