import { supabase } from './supabase'

export const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-career-compass.etijahcoaching.com').replace(/\/$/, '')

async function authHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const RETRY_DELAY_MS = 800
const MAX_AUTH_RETRIES = 2

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Right after a redirect (assessment submit, login) the Supabase client can
// still be hydrating/refreshing its session when the first authenticated
// call fires, producing a network error or a 401 that has nothing to do with
// the request itself. `getHeaders` is called fresh on each attempt so a retry
// picks up a session that's since settled, rather than reusing stale headers.
// A single 800ms retry wasn't always enough (a real token refresh round-trip
// to Supabase Auth can take longer), so a 401 gets a couple of tries with
// backoff before giving up — capped at 2 (not more) since every one of these
// also runs for a *genuinely* expired session, where retrying can't help and
// just adds latency before the real error/redirect-to-login surfaces.
async function requestWithRetry(path: string, init: RequestInit, getHeaders: () => Promise<Record<string, string>>): Promise<Response> {
    async function attempt(): Promise<Response> {
        const headers = { ...init.headers, ...(await getHeaders()) }
        return fetch(`${BASE_URL}${path}`, { ...init, headers })
    }

    let res: Response
    try {
        res = await attempt()
    } catch {
        await wait(RETRY_DELAY_MS)
        res = await attempt()
    }
    for (let i = 0; i < MAX_AUTH_RETRIES && res.status === 401; i++) {
        await wait(RETRY_DELAY_MS * (i + 1))
        res = await attempt()
    }
    return res
}

// FastAPI error bodies are `{"detail": "..."}` — pull that out so callers (and
// any UI that renders err.message directly) show the human-readable message
// instead of the raw JSON string.
async function errorMessage(res: Response): Promise<string> {
    const text = await res.text()
    try {
        const body = JSON.parse(text)
        if (typeof body?.detail === 'string') return body.detail
    } catch {}
    return text || `Request failed: ${res.status}`
}

async function asJson<T>(res: Response): Promise<T> {
    if (!res.ok) {
        throw new Error(await errorMessage(res))
    }
    return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await requestWithRetry(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }, async () => ({}))
    return asJson<T>(res)
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await requestWithRetry(path, {}, async () => ({}))
    return asJson<T>(res)
}

export async function apiAuthGet<T>(path: string): Promise<T> {
    const res = await requestWithRetry(path, {}, authHeader)
    return asJson<T>(res)
}

// For binary responses (e.g. PDF downloads) that need the auth header a plain
// <a href> can't carry — fetches as a blob and reads the filename off
// Content-Disposition so callers don't have to guess it.
export async function apiAuthGetBlob(path: string): Promise<{ blob: Blob; filename: string | null }> {
    const res = await requestWithRetry(path, {}, authHeader)
    if (!res.ok) {
        throw new Error(await errorMessage(res))
    }
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    return { blob: await res.blob(), filename: match ? match[1] : null }
}

export async function apiAuthPost<T>(path: string, body: unknown): Promise<T> {
    const res = await requestWithRetry(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }, authHeader)
    return asJson<T>(res)
}

export async function apiAuthPatch<T>(path: string, body: unknown): Promise<T> {
    const res = await requestWithRetry(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }, authHeader)
    return asJson<T>(res)
}

export type PlanCode = 'pathfinder' | 'launchpad_monthly' | 'launchpad_yearly'

export async function startCheckout(planCode: PlanCode): Promise<{ checkout_url: string }> {
    return apiAuthPost<{ checkout_url: string }>('/billing/checkout', { plan_code: planCode })
}

export async function apiAuthDelete<T>(path: string): Promise<T> {
    const res = await requestWithRetry(path, { method: 'DELETE' }, authHeader)
    return asJson<T>(res)
}
