import { supabase } from './supabase'

export const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-career-compass.etijahcoaching.com').replace(/\/$/, '')

async function authHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const RETRY_DELAY_MS = 800

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Right after a redirect (assessment submit, login) the Supabase client can
// still be hydrating/refreshing its session when the first authenticated
// call fires, producing a network error or a 401 that has nothing to do with
// the request itself. `getHeaders` is called fresh on each attempt so a retry
// picks up a session that's since settled, rather than reusing stale headers.
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
    if (res.status === 401) {
        await wait(RETRY_DELAY_MS)
        res = await attempt()
    }
    return res
}

async function asJson<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
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
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
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
