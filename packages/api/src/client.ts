import type { ApiResponse } from '@valuation-os/types'

let baseUrl = ''

interface ApiAuthConfig {
  getAccessToken?: () => string | undefined
  getRefreshToken?: () => string | undefined
  setTokens?: (tokens: { accessToken: string; refreshToken?: string }) => void
  clearTokens?: () => void
}

let authConfig: ApiAuthConfig = {}

export function setApiBaseUrl(url: string) {
  baseUrl = url
}

export function setApiAuth(config: ApiAuthConfig) {
  authConfig = config
}

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponse<T>
  if (!json.success) {
    throw new ApiRequestError(
      json.error.code,
      json.error.message,
      res.status,
      json.error.details,
    )
  }
  return json.data
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authConfig.getRefreshToken?.()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
      credentials: 'include',
    })

    const data = await parseResponse<{ accessToken: string; refreshToken?: string }>(res)
    authConfig.setTokens?.({
      accessToken: data.accessToken,
      ...(data.refreshToken ? { refreshToken: data.refreshToken } : {}),
    })
    return data.accessToken
  } catch {
    authConfig.clearTokens?.()
    return null
  }
}

async function request<T>(path: string, init: RequestInit, allowRetry = true): Promise<T> {
  const accessToken = authConfig.getAccessToken?.()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (res.status === 401 && allowRetry && authConfig.getRefreshToken) {
    const nextAccessToken = await refreshAccessToken()
    if (nextAccessToken) {
      return request<T>(path, init, false)
    }
  }

  return parseResponse<T>(res)
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(`${baseUrl}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v))
    })
  }
  const accessToken = authConfig.getAccessToken?.()
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers,
  })

  if (res.status === 401 && authConfig.getRefreshToken) {
    const nextAccessToken = await refreshAccessToken()
    if (nextAccessToken) {
      const retryHeaders = new Headers({ 'Content-Type': 'application/json' })
      retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`)
      const retry = await fetch(url.toString(), {
        credentials: 'include',
        headers: retryHeaders,
      })
      return parseResponse<T>(retry)
    }
  }

  return parseResponse<T>(res)
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(
    path,
    {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    path !== '/api/v1/auth/refresh',
  )
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
  })
}
