// design-sync stub for '@/lib/api'. The real module reads
// `process.env.NEXT_PUBLIC_API_URL` and imports '@/lib/supabase' at module
// scope — both throw when bundled for a static browser preview (no Next.js
// build-time env inlining, no real Supabase project to auth against). This
// keeps the same call surface used by the synced components (telemetry's
// `apiPost`) as a real fetch against the same production fallback URL the
// app itself falls back to, without the env/auth dependency.
// See .design-sync/NOTES.md.

export const BASE_URL = 'https://backend-career-compass.etijahcoaching.com'

async function asJson<T>(res: Response): Promise<T> {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return asJson<T>(res)
}

export async function apiGet<T>(path: string): Promise<T> {
    return asJson<T>(await fetch(`${BASE_URL}${path}`))
}
