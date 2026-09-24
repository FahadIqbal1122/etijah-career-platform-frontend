// Google Tag Manager data-layer helpers. Tags (GA4, Meta, LinkedIn, Google Ads)
// are configured inside GTM itself — the app only pushes named events here.
// Client-only: call from effects or event handlers, never during render/SSR.

const VARIANT_KEY = 'etijahi_landing_variant'

type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] }

// Remembered per browser tab so every later event can be attributed to the
// /start/<variant> landing page the visitor entered through.
export function setLandingVariant(variant: string): void {
  try { window.sessionStorage.setItem(VARIANT_KEY, variant) } catch {}
}

function getLandingVariant(): string | undefined {
  try { return window.sessionStorage.getItem(VARIANT_KEY) ?? undefined } catch { return undefined }
}

export function track(event: string, data: Record<string, unknown> = {}): void {
  try {
    const w = window as DataLayerWindow
    w.dataLayer = w.dataLayer || []
    const landing_variant = getLandingVariant()
    w.dataLayer.push({ event, ...data, ...(landing_variant ? { landing_variant } : {}) })
  } catch {
    // analytics must never break the app
  }
}

// Fires at most once per `key` — for moments a refresh or re-render could
// repeat. `persist: 'local'` survives across sessions (use for purchases);
// the default is per-tab-session.
export function trackOnce(
  key: string,
  event: string,
  data: Record<string, unknown> = {},
  persist: 'session' | 'local' = 'session',
): void {
  try {
    const store = persist === 'local' ? window.localStorage : window.sessionStorage
    const k = `tracked:${key}`
    if (store.getItem(k)) return
    store.setItem(k, '1')
  } catch {
    // storage unavailable — fall through and fire rather than lose the event
  }
  track(event, data)
}
