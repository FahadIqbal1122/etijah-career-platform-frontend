// Simple in-memory sliding-window rate limiter for the public form-proxy
// routes (feedback/partners/waitlist/waitlist-events), which previously had
// no throttling at all — anyone could script requests straight past the
// client-side validation and flood the underlying tables.
//
// This works because the app runs as a persistent Node process (manual
// Docker Compose deploy, not ephemeral serverless functions) — state
// survives between requests within one container. It resets on
// redeploy/restart, which is an acceptable tradeoff for basic abuse
// throttling on public forms; it isn't meant to be a hard security boundary.
const buckets = new Map<string, number[]>()

// Bound memory growth from an unbounded set of distinct keys (e.g. a scripted
// attacker cycling through spoofed X-Forwarded-For values) — sweep
// occasionally rather than on every call.
let lastSweep = Date.now()
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    for (const [k, timestamps] of buckets) {
      if (timestamps.every(t => now - t > windowMs)) buckets.delete(k)
    }
    lastSweep = now
  }

  const timestamps = (buckets.get(key) || []).filter(t => now - t < windowMs)
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps)
    return true
  }
  timestamps.push(now)
  buckets.set(key, timestamps)
  return false
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
