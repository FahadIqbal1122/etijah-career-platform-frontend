const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-career-compass.etijahcoaching.com').replace(/\/$/, '')

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
