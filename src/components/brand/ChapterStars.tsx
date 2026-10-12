// ChapterStars — the assessment's five-star progress map (one star per chapter).
// Replaces the plain dots-and-hairlines of Constellation for the assessment only: real four-point stars with a soft
// glow, a path that lights up as chapters are finished, a bigger north star, a faint field of background dust and a
// number under each star. Lit stars are bright, the next one pulses, the rest are quiet outlines.
//
//   theme: 'dark' (on the navy assessment gradient) | 'teal' (on the light green chapter-complete screen)

type Props = {
  litCount: number          // how many chapters are finished (stars lit)
  theme?: 'dark' | 'teal'
  rippleKey?: number        // changes on every advance, replays the arrival flash on the newest star
  accent?: string
}

const VIEWBOX = { w: 400, h: 210 }

// Rising from lower-left to the north star at upper-right (ufuq = horizon).
const NODES = [
  { x: 48, y: 148 },
  { x: 124, y: 102 },
  { x: 200, y: 140 },
  { x: 278, y: 74 },
  { x: 352, y: 38 }, // north star
]
const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 3]]

// Fixed background dust (no randomness: the markup must be identical on server and client).
const DUST: { x: number; y: number; r: number; o: number; t?: number }[] = [
  { x: 18, y: 36, r: 1.1, o: .35, t: 0 }, { x: 70, y: 18, r: .8, o: .25 }, { x: 108, y: 54, r: 1.3, o: .4, t: 1.1 },
  { x: 150, y: 24, r: .8, o: .3 }, { x: 188, y: 62, r: 1, o: .28, t: 2.2 }, { x: 236, y: 22, r: 1.2, o: .38 },
  { x: 262, y: 128, r: .9, o: .26, t: .6 }, { x: 318, y: 96, r: 1, o: .3 }, { x: 376, y: 112, r: 1.2, o: .36, t: 1.7 },
  { x: 30, y: 196, r: 1, o: .28 }, { x: 96, y: 176, r: .8, o: .24, t: 2.6 }, { x: 160, y: 190, r: 1.2, o: .34 },
  { x: 232, y: 186, r: .9, o: .26, t: 1.4 }, { x: 306, y: 168, r: 1.1, o: .32 }, { x: 380, y: 186, r: .8, o: .24, t: .3 },
  { x: 344, y: 12, r: .9, o: .3 }, { x: 14, y: 110, r: .8, o: .24, t: 2 }, { x: 214, y: 100, r: .7, o: .22 },
]

// A four-point sparkle: curved sides pinched toward the centre. r = tip distance from the middle.
const sparkle = (r: number, pinch = 0.2) =>
  `M0 ${-r} Q${r * pinch} ${-r * pinch} ${r} 0 Q${r * pinch} ${r * pinch} 0 ${r} Q${-r * pinch} ${r * pinch} ${-r} 0 Q${-r * pinch} ${-r * pinch} 0 ${-r}Z`

export default function ChapterStars({ litCount, theme = 'dark', rippleKey = 0, accent = '#00C9A7' }: Props) {
  const total = NODES.length
  const lit = Math.max(0, Math.min(total, litCount))
  const frontier = lit - 1          // newest lit star
  const next = lit < total ? lit : -1 // the star to earn next (pulses softly)
  const teal = theme === 'teal'

  const c = teal
    ? {
        dust: '#0770BA', line: '#0770BA', lineDim: 'rgba(7,112,186,0.32)', star: '#0770BA', north: '#0770BA',
        halo: '#0770BA', core: '#FFFFFF', dimFill: 'rgba(7,112,186,0.10)', dimStroke: 'rgba(7,112,186,0.5)',
        label: 'rgba(7,112,186,0.85)', labelDim: 'rgba(7,112,186,0.5)',
      }
    : {
        dust: '#FFFFFF', line: '#FFFFFF', lineDim: 'rgba(255,255,255,0.28)', star: '#FFFFFF', north: accent,
        halo: '#BFE9FF', core: '#FFFFFF', dimFill: 'rgba(255,255,255,0.08)', dimStroke: 'rgba(255,255,255,0.55)',
        label: 'rgba(255,255,255,0.92)', labelDim: 'rgba(255,255,255,0.5)',
      }

  const id = `cs-${theme}`

  return (
    <svg className="cst" viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.halo} stopOpacity="0.85" />
          <stop offset="40%" stopColor={c.halo} stopOpacity="0.28" />
          <stop offset="100%" stopColor={c.halo} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-north`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.north} stopOpacity="0.95" />
          <stop offset="45%" stopColor={c.north} stopOpacity="0.32" />
          <stop offset="100%" stopColor={c.north} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* background dust */}
      <g aria-hidden="true">
        {DUST.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={c.dust} opacity={d.o}
            className={d.t !== undefined ? 'cs-twinkle' : undefined}
            style={d.t !== undefined ? { animationDelay: `${d.t}s` } : undefined} />
        ))}
      </g>

      {/* the path between stars: bright and glowing once both ends are lit, dashed and quiet before that */}
      <g>
        {LINKS.map(([a, b], i) => {
          const on = a < lit && b < lit
          const half = !on && (a < lit || b < lit)
          return (
            <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
              stroke={on ? c.line : c.lineDim} strokeWidth={on ? 1.7 : 1.1} strokeLinecap="round"
              strokeDasharray={on ? undefined : half ? '3 5' : '1.5 6'}
              opacity={on ? 0.85 : half ? 0.9 : 0.7}
              filter={on ? `url(#${id}-glow)` : undefined}
              style={{ transition: 'stroke .6s ease, opacity .6s ease' }} />
          )
        })}
      </g>

      {/* the stars */}
      <g>
        {NODES.map((n, i) => {
          const on = i < lit
          const isNorth = i === total - 1
          const R = isNorth ? 20 : 15
          const fill = on ? (isNorth ? c.north : c.star) : c.dimFill
          return (
            <g key={i} transform={`translate(${n.x} ${n.y})`}>
              {/* soft glow behind a lit star; a slow pulse on the one to earn next */}
              {on && <circle r={R * 2.8} fill={`url(#${isNorth ? `${id}-north` : `${id}-halo`})`}
                className={i === frontier ? 'cs-breathe' : undefined} />}
              {i === next && <circle r={R * 1.9} fill={`url(#${id}-halo)`} opacity=".55" className="cs-breathe" />}

              {/* arrival flash on the newest star */}
              {on && i === frontier && (
                <circle key={`rp-${rippleKey}`} r={R * 0.9} fill="none" stroke={isNorth ? c.north : c.halo}
                  strokeWidth="1.4" className="cst-ripple" style={{ animationDuration: '1.6s' }} />
              )}

              {/* the star: a second, smaller sparkle turned 45° makes the north star eight-pointed */}
              {isNorth && <path d={sparkle(R * 0.62, 0.3)} transform="rotate(45)" fill={fill} opacity={on ? 0.9 : 0}
                filter={on ? `url(#${id}-glow)` : undefined} />}
              <path d={sparkle(R, isNorth ? 0.17 : 0.2)} fill={fill}
                stroke={on ? 'none' : c.dimStroke} strokeWidth={on ? 0 : 1.2} strokeLinejoin="round"
                filter={on ? `url(#${id}-glow)` : undefined}
                style={{ transition: 'fill .5s ease' }} />
              {on && <circle r={isNorth ? 3.2 : 2.5} fill={c.core} />}
              {!on && <circle r="1.7" fill={c.dimStroke} />}

              {/* chapter number */}
              <text y={R + 18} textAnchor="middle" fontSize="11.5" fontWeight={on ? 700 : 500}
                fill={on ? c.label : c.labelDim} style={{ fontFamily: 'var(--font-mono), monospace', letterSpacing: '.06em' }}>
                {i + 1}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
