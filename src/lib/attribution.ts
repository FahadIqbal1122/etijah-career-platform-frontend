// First-touch ad attribution. When someone lands from an ad, the URL carries
// utm_* parameters and (with Google Ads auto-tagging) a gclid. We keep the first
// set we see in this browser so it survives navigation and the Google sign-in
// redirect, and attach it to the assessment's `session_start` telemetry event
// (which is linked to the saved response on submit). That is how a buyer is
// traced back to the campaign / keyword that brought them.
// Client-only: call from effects, never during render/SSR.

const KEY = 'etijahi_attribution'
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'] as const
const MAX_LEN = 200 // telemetry payloads are capped at 2000 chars server-side; a gclid can exceed 100

export type Attribution = Partial<Record<typeof PARAMS[number] | 'landing_path', string>>

// Call on every page load: stores the first touch only, never overwrites it.
export function captureAttribution(): void {
  try {
    if (window.localStorage.getItem(KEY)) return
    const q = new URLSearchParams(window.location.search)
    const found: Attribution = {}
    for (const p of PARAMS) {
      const v = q.get(p)
      if (v) found[p] = v.slice(0, MAX_LEN)
    }
    if (Object.keys(found).length === 0) return // organic / direct visit: nothing to remember
    found.landing_path = window.location.pathname.slice(0, MAX_LEN)
    window.localStorage.setItem(KEY, JSON.stringify(found))
  } catch { /* storage unavailable: attribution is best-effort */ }
}

export function getAttribution(): Attribution | undefined {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Attribution) : undefined
  } catch { return undefined }
}
