// Logomark — the official Etijahi "Constellation" logomark.
// Connected nodes rising to a single Electric Teal destination star — a journey
// mapped step by step. Ported from Design/src/logomark.jsx.
//
//   tone: 'light' → blue path + teal star  (on white / #EBF3FF)
//         'dark'  → white path + teal star (on Primary Blue / charcoal)

type LogomarkProps = {
  size?: number
  tone?: 'light' | 'dark'
  star?: string
  glow?: boolean
  className?: string
  title?: string
}

type Node = { x: number; y: number; r: number }

export default function Logomark({
  size = 30,
  tone = 'light',
  star = '#00C9A7',
  glow = false,
  className = '',
  title = 'Etijahi',
}: LogomarkProps) {
  const path = tone === 'dark' ? '#FFFFFF' : '#0770BA'
  const halo = tone === 'dark' ? 'rgba(0,201,167,0.55)' : 'rgba(0,201,167,0.42)'

  // Geometry on a 0 0 32 32 field: connected nodes rising bottom-left → top-right.
  const N: Record<'a' | 'b' | 'c' | 'd' | 's', Node> = {
    a: { x: 5.0, y: 26.4, r: 2.0 },
    b: { x: 11.4, y: 21.0, r: 1.9 },
    c: { x: 14.6, y: 12.6, r: 1.8 },
    d: { x: 20.2, y: 15.6, r: 1.7 },
    s: { x: 25.8, y: 6.4, r: 3.0 },
  }
  const Line = ({ p, q, w = 1.7 }: { p: Node; q: Node; w?: number }) => (
    <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={path} strokeWidth={w} strokeLinecap="round" />
  )

  return (
    <svg
      className={`logomark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={title}
      style={glow ? { filter: `drop-shadow(0 1px 4px ${star}55)`, overflow: 'visible' } : { overflow: 'visible' }}
    >
      <Line p={N.a} q={N.b} />
      <Line p={N.b} q={N.c} />
      <Line p={N.c} q={N.d} />
      <Line p={N.d} q={N.s} />
      <circle cx={N.a.x} cy={N.a.y} r={N.a.r} fill={path} />
      <circle cx={N.b.x} cy={N.b.y} r={N.b.r} fill={path} />
      <circle cx={N.c.x} cy={N.c.y} r={N.c.r} fill={path} />
      <circle cx={N.d.x} cy={N.d.y} r={N.d.r} fill={path} />
      <circle cx={N.s.x} cy={N.s.y} r={5.1} fill="none" stroke={halo} strokeWidth="1" />
      <circle cx={N.s.x} cy={N.s.y} r={N.s.r} fill={star} />
    </svg>
  )
}

// Full lockup: logomark + bilingual wordmark. `tone='dark'` for use on the brand
// gradient; `tone='light'` on white surfaces.
export function Wordmark({ tone = 'light', size = 30 }: { tone?: 'light' | 'dark'; size?: number }) {
  const ink = tone === 'dark' ? '#FFFFFF' : '#0770BA'
  const faint = tone === 'dark' ? 'rgba(255,255,255,0.7)' : 'var(--ink-faint)'
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logomark size={size} tone={tone} />
      <span className="flex flex-col leading-none">
        <span style={{ color: ink, fontWeight: 800, fontSize: size * 0.6 }}>Etijahi</span>
        {/* Arabic wordmark — Tajawal (IBM Plex Mono has no Arabic glyphs) */}
        <span className="font-sans" style={{ color: faint, fontWeight: 700, fontSize: size * 0.34 }}>
          إتجاهي
        </span>
      </span>
    </span>
  )
}
