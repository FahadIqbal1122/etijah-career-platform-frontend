import { supabase } from './supabase'

export const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-career-compass.etijahcoaching.com').replace(/\/$/, '')

async function authHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
    }
    return res.json()
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`)
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
    }
    return res.json()
}

export async function apiAuthGet<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, { headers: await authHeader() })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
    }
    return res.json()
}

export async function apiAuthPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
    }
    return res.json()
}

export async function apiAuthPatch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
    }
    return res.json()
}

export async function apiAuthDelete<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'DELETE',
        headers: await authHeader(),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
    }
    return res.json()
}
