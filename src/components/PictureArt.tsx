// Flat illustrations for the picture-card questions. Drawn in-house (inline SVG, brand colours), so there is nothing to
// download, no licence to follow, and they scale and sit in light/dark/RTL without changes. All share one 120x90 canvas.

const BLUE = '#0770BA'
const DEEP = '#075288'
const SKY = '#CFE5F7'
const TEAL = '#00C9A7'
const MINT = '#BFF0E6'
const AMBER = '#F5B942'
const SAND = '#FCE3A8'
const CORAL = '#F08A7A'
const GREY = '#DDE5EC'

// a grid of small window squares
function windows(x: number, y: number, cols: number, rows: number, gap = 9, size = 5, fill = '#fff') {
  const out = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(<rect key={`${r}-${c}`} x={x + c * gap} y={y + r * gap} width={size} height={size} rx="1" fill={fill} />)
  return out
}

function Person({ x, y, s = 1, color = BLUE }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-14" r="8" fill={color} />
      <path d="M-12 14 v-10 a12 12 0 0 1 24 0 v10 z" fill={color} />
    </g>
  )
}

const ART: Record<string, React.ReactNode> = {
  // ── warm-up: what do you enjoy doing ──────────────────────────
  solve: (
    <>
      <rect x="16" y="40" width="36" height="36" rx="6" fill={SKY} />
      <circle cx="52" cy="58" r="8" fill={SKY} />
      <g transform="rotate(10 78 50)">
        <rect x="58" y="32" width="36" height="36" rx="6" fill={BLUE} />
        <circle cx="58" cy="50" r="8" fill={BLUE} />
      </g>
      <circle cx="94" cy="20" r="11" fill={AMBER} />
      <rect x="89" y="30" width="10" height="5" rx="2" fill={DEEP} />
      <path d="M94 4 v-3 M108 20 h3 M77 20 h-3 M104 10 l2 -2 M84 10 l-2 -2" stroke={AMBER} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  create: (
    <>
      <ellipse cx="52" cy="50" rx="34" ry="28" fill={SAND} />
      <circle cx="38" cy="42" r="6" fill={CORAL} />
      <circle cx="54" cy="34" r="6" fill={TEAL} />
      <circle cx="70" cy="44" r="6" fill={BLUE} />
      <circle cx="40" cy="62" r="6" fill="#fff" />
      <g transform="rotate(32 92 46)">
        <rect x="88" y="14" width="9" height="44" rx="4.5" fill={DEEP} />
        <rect x="88" y="58" width="9" height="12" rx="3" fill={AMBER} />
      </g>
    </>
  ),
  help: (
    <>
      <path d="M60 24 c-7 -9 -20 -2 -12 8 l12 11 l12 -11 c8 -10 -5 -17 -12 -8 z" fill={CORAL} transform="translate(0 -12) scale(1)" />
      <Person x={38} y={56} s={1.15} color={BLUE} />
      <Person x={82} y={60} s={0.95} color={TEAL} />
      <path d="M48 62 q12 -10 24 -2" stroke={DEEP} strokeWidth="4" strokeLinecap="round" fill="none" />
    </>
  ),
  lead: (
    <>
      <Person x={52} y={44} s={1.25} color={BLUE} />
      <Person x={24} y={74} s={0.8} color={TEAL} />
      <Person x={52} y={78} s={0.8} color={TEAL} />
      <Person x={80} y={74} s={0.8} color={TEAL} />
      <rect x="74" y="8" width="34" height="22" rx="8" fill={AMBER} />
      <path d="M80 30 l-4 10 l12 -10 z" fill={AMBER} />
      <path d="M81 16 h20 M81 22 h13" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  build: (
    <>
      <circle cx="44" cy="52" r="20" fill="none" stroke={BLUE} strokeWidth="10" strokeDasharray="7 6.6" />
      <circle cx="44" cy="52" r="17" fill={SKY} />
      <circle cx="44" cy="52" r="7" fill={BLUE} />
      <g transform="rotate(40 88 44)">
        <rect x="84" y="14" width="9" height="56" rx="4.5" fill={AMBER} />
        <path d="M80 10 h17 v12 h-6 v-5 h-5 v5 h-6 z" fill={AMBER} />
      </g>
    </>
  ),
  organise: (
    <>
      <rect x="28" y="12" width="64" height="72" rx="8" fill="#fff" stroke={BLUE} strokeWidth="3" />
      <rect x="46" y="6" width="28" height="12" rx="5" fill={TEAL} />
      <path d="M40 34 l4 4 l8 -9" stroke={TEAL} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 54 l4 4 l8 -9" stroke={TEAL} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="58" y="31" width="26" height="5" rx="2.5" fill={SKY} />
      <rect x="58" y="51" width="20" height="5" rx="2.5" fill={SKY} />
      <rect x="40" y="70" width="44" height="5" rx="2.5" fill={GREY} />
    </>
  ),

  // ── work pace ─────────────────────────────────────────────────
  fast: (
    <>
      <circle cx="60" cy="46" r="34" fill={SAND} />
      <path d="M68 12 L36 52 h20 l-6 26 l34 -42 h-22 z" fill={AMBER} stroke={DEEP} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M12 30 q6 -8 14 -4 M10 58 q8 -6 16 0" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </>
  ),
  steady: (
    <>
      <circle cx="60" cy="44" r="32" fill="#fff" stroke={BLUE} strokeWidth="4" />
      <circle cx="60" cy="44" r="28" fill={MINT} />
      <path d="M60 24 v21 l14 8" stroke={DEEP} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="60" cy="44" r="3.5" fill={DEEP} />
      <path d="M14 82 q11 -8 22 0 t22 0 t22 0 t22 0" stroke={TEAL} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </>
  ),

  // ── organisation size ─────────────────────────────────────────
  big_org: (
    <>
      <rect x="18" y="30" width="28" height="56" rx="3" fill={SKY} />
      <rect x="46" y="8" width="34" height="78" rx="3" fill={BLUE} />
      <rect x="80" y="36" width="24" height="50" rx="3" fill={SKY} />
      {windows(23, 36, 3, 5, 8, 4.5, '#fff')}
      {windows(52, 15, 3, 7, 10, 5.5, '#E6F1FA')}
      {windows(85, 42, 2, 4, 9, 4.5, '#fff')}
      <rect x="10" y="85" width="100" height="3" rx="1.5" fill={DEEP} />
    </>
  ),
  small_team: (
    <>
      <rect x="24" y="36" width="72" height="48" rx="4" fill={SKY} />
      <path d="M18 38 h84 l-6 -18 h-72 z" fill={TEAL} />
      <path d="M30 20 v18 M48 20 v18 M66 20 v18 M84 20 v18" stroke="#fff" strokeWidth="3" opacity=".7" />
      <rect x="50" y="52" width="20" height="32" rx="3" fill={BLUE} />
      <rect x="30" y="48" width="14" height="14" rx="2" fill="#fff" />
      <rect x="76" y="48" width="14" height="14" rx="2" fill="#fff" />
      <circle cx="104" cy="66" r="6" fill={MINT} /><rect x="102.5" y="70" width="3" height="14" fill={DEEP} />
    </>
  ),

  // ── sector ────────────────────────────────────────────────────
  government: (
    <>
      <path d="M60 10 L104 32 H16 z" fill={BLUE} />
      <rect x="22" y="36" width="76" height="6" rx="2" fill={SKY} />
      {[28, 44, 60, 76].map(x => <rect key={x} x={x} y="44" width="10" height="30" rx="2" fill={SKY} />)}
      <rect x="14" y="74" width="92" height="9" rx="2" fill={DEEP} />
      <rect x="59" y="0" width="2" height="12" fill={DEEP} />
      <path d="M61 1 h12 l-3 4 l3 4 h-12 z" fill={TEAL} />
    </>
  ),
  private: (
    <>
      <rect x="14" y="48" width="14" height="34" rx="2" fill={SKY} />
      <rect x="34" y="36" width="14" height="46" rx="2" fill={MINT} />
      <rect x="54" y="22" width="14" height="60" rx="2" fill={TEAL} />
      <path d="M14 38 l22 -14 l18 8 l30 -22" stroke={DEEP} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M78 8 h12 v12" stroke={DEEP} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="76" y="52" width="32" height="26" rx="5" fill={AMBER} />
      <path d="M86 52 v-5 a3 3 0 0 1 3 -3 h6 a3 3 0 0 1 3 3 v5" stroke={DEEP} strokeWidth="3" fill="none" />
      <rect x="76" y="62" width="32" height="3" fill={DEEP} opacity=".35" />
    </>
  ),

  // ── ideal career structure ────────────────────────────────────
  employee: (
    <>
      <rect x="26" y="14" width="40" height="70" rx="3" fill={BLUE} />
      {windows(33, 22, 3, 5, 11, 6, '#E6F1FA')}
      <rect x="10" y="82" width="100" height="3" rx="1.5" fill={DEEP} />
      <Person x={88} y={64} s={1.1} color={TEAL} />
    </>
  ),
  founder: (
    <>
      <path d="M60 6 c14 10 18 28 14 46 h-28 c-4 -18 0 -36 14 -46 z" fill={SKY} stroke={BLUE} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="32" r="7" fill={BLUE} />
      <path d="M46 46 l-12 16 l14 -3 z M74 46 l12 16 l-14 -3 z" fill={TEAL} />
      <path d="M52 56 q8 20 16 0 z" fill={AMBER} />
      <path d="M60 64 v14" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  blend: (
    <>
      <rect x="14" y="30" width="30" height="54" rx="3" fill={BLUE} />
      {windows(20, 37, 3, 4, 9, 4.5, '#E6F1FA')}
      <path d="M52 84 h12" stroke={DEEP} strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(70 4) scale(.62)">
        <path d="M30 6 c14 10 18 28 14 46 h-28 c-4 -18 0 -36 14 -46 z" fill={SKY} stroke={BLUE} strokeWidth="4" strokeLinejoin="round" />
        <circle cx="30" cy="32" r="7" fill={BLUE} />
        <path d="M16 46 l-12 16 l14 -3 z M44 46 l12 16 l-14 -3 z" fill={TEAL} />
        <path d="M22 56 q8 20 16 0 z" fill={AMBER} />
      </g>
      <path d="M48 56 h18" stroke={TEAL} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1 7" />
    </>
  ),
}

export const ART_NAMES = Object.keys(ART)

export default function PictureArt({ name }: { name: string }) {
  const art = ART[name]
  if (!art) return null
  return (
    <svg viewBox="0 0 120 90" className="art-svg" aria-hidden="true" focusable="false">
      {art}
    </svg>
  )
}
