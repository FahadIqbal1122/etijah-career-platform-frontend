import type { CSSProperties, ReactNode } from 'react'

export const MONO = "var(--font-mono), ui-monospace, monospace"

export function Lock({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
}
export function Check({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
}
export function Arrow({ size = 18, flip = false }: { size?: number; flip?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}
export function Logo({ size = 28, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs><linearGradient id={`rt-lg-${size}`} x1="18" y1="102" x2="100" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#0052CC" /><stop offset="1" stopColor="#00C9A7" /></linearGradient></defs>
      <path d="M20 100 L44 68 L72 78 L98 22" stroke={color || `url(#rt-lg-${size})`} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="98" cy="22" r="9" fill="#00C9A7" />
    </svg>
  )
}

// A link that behaves in the admin preview (no navigation) and on the live page.
export function A({ href, preview, style, track, children }: { href: string; preview?: boolean; style?: CSSProperties; track?: string; children: ReactNode }) {
  return <a href={href} data-track={track} onClick={preview ? e => e.preventDefault() : undefined} style={{ textDecoration: 'none', ...style }}>{children}</a>
}

// Stand-in text drawn (blurred) in place of a locked career name, so the real name is not in the markup.
export const MASK = 'Xxxxxxx Xxxxxxxx'

export const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))
