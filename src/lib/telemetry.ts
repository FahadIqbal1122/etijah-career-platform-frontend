// Best-effort behavioral telemetry for the assessment: device type,
// break-panel games/riddles played, and per-question pacing — feeds the
// admin "Behavior" dashboard. Entirely separate from the answers pipeline:
// nothing here is ever sent to /assessment/submit's `answers` field, and a
// dropped/failed telemetry call never surfaces to the user or blocks the
// assessment. All functions here are client-only — call them from effects
// or event handlers, never during render/SSR.

import { apiPost, BASE_URL } from './api'

const SESSION_KEY = 'ufuq_telemetry_session_id'
const FLUSH_INTERVAL_MS = 8000
const FLUSH_BATCH_SIZE = 8
const MOBILE_BREAKPOINT = 900 // matches globals.css's `@media (min-width: 900px)`

export type TelemetryEventType = 'session_start' | 'question_view' | 'break_open' | 'break_activity'

export interface TelemetryEvent {
  event_type: TelemetryEventType
  question_id?: string
  activity_kind?: string
  duration_ms?: number
  payload?: Record<string, unknown>
}

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getTelemetrySessionId(): string {
  try {
    let id = window.localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = newSessionId()
      window.localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return newSessionId() // localStorage unavailable (private mode, quota) — still usable for this call, just not persisted
  }
}

// Starts a fresh session — call after a completed submit, or when a draft is
// discarded/restarted, so a retake isn't conflated with the previous attempt.
export function rotateTelemetrySession(): void {
  try { window.localStorage.setItem(SESSION_KEY, newSessionId()) } catch {}
}

let queue: TelemetryEvent[] = []
let deviceType: 'mobile' | 'desktop' | null = null
let localeRef = 'en'
let flushTimer: number | null = null

export function initTelemetry(locale: string): void {
  localeRef = locale
  deviceType = window.innerWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop'
}

function scheduleFlush() {
  if (flushTimer !== null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_INTERVAL_MS)
}

export function pushTelemetry(event: TelemetryEvent): void {
  queue.push(event)
  if (queue.length >= FLUSH_BATCH_SIZE) flush()
  else scheduleFlush()
}

// `useBeacon` fires the batch via navigator.sendBeacon instead of fetch —
// needed on page unload, where an in-flight fetch would otherwise get
// cancelled before it reaches the server.
export function flush(useBeacon = false): void {
  if (queue.length === 0) return
  const events = queue
  queue = []
  const body = { session_id: getTelemetrySessionId(), device_type: deviceType, locale: localeRef, events }

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(`${BASE_URL}/assessment/telemetry`, new Blob([JSON.stringify(body)], { type: 'application/json' }))
      return
    } catch {
      // fall through to a best-effort fetch below
    }
  }
  apiPost('/assessment/telemetry', body).catch(() => {})
}
