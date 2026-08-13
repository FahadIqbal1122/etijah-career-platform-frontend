const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '')

// Admin-togglable via /admin → Homepage tab (app_settings.homepage_mode).
// Revalidated every 30s so the toggle takes effect quickly without hitting
// the backend on every single request to these pages.
export async function getHomepageMode(): Promise<'landing' | 'waitlist'> {
  try {
    const res = await fetch(`${BACKEND}/homepage-mode`, { next: { revalidate: 30 } })
    if (!res.ok) return 'landing'
    const data = await res.json()
    return data.mode === 'waitlist' ? 'waitlist' : 'landing'
  } catch {
    return 'landing'
  }
}
