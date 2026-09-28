// design-sync stub for '@/lib/telemetry'. The real module transitively
// imports '@/lib/api' -> '@/lib/supabase' via RELATIVE specifiers (so the
// tsconfig path-alias override can't intercept them), both of which read
// `process.env.*` at module scope and throw when bundled for a static
// browser preview. Telemetry is documented as best-effort/fire-and-forget
// (dropped calls never surface to the user) — this preserves that contract
// without the app's real API base URL. See .design-sync/NOTES.md.

export type TelemetryEventType = 'session_start' | 'question_view' | 'break_open' | 'break_activity'

export interface TelemetryEvent {
  event_type: TelemetryEventType
  question_id?: string
  activity_kind?: string
  duration_ms?: number
  payload?: Record<string, unknown>
}

export function getTelemetrySessionId(): string {
  return 'preview-session'
}

export function rotateTelemetrySession(): void {}

export function initTelemetry(_locale: string): void {}

export function pushTelemetry(_event: TelemetryEvent): void {}

export function flush(_useBeacon = false): void {}
