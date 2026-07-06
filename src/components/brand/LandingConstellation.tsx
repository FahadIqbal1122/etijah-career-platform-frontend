// LandingConstellation — the signature "horizon" asterism, scaled up for the
// landing page hero background and final-CTA glow. Ported from
// Design/src/landing-constellation.jsx (distinct from the smaller assessment
// Constellation used in the question flow).
//
//   lit    0..1 fraction of nodes lit (hero = partial ~0.55, bookends = 1)
//   theme  'light' (on #EBF3FF / white)  |  'onblue' (on Primary Blue / teal)
//   pulse  gently pulse the lit nodes (final CTA "glowing")

const LANDING_CST = {
  viewBox: '0 0 520 360',
  nodes: [
    { x: 40, y: 300 },
    { x: 96, y: 250 },
    { x: 70, y: 188 },
    { x: 150, y: 214 },
    { x: 198, y: 158 },
    { x: 256, y: 196 },
    { x: 250, y: 116 },
    { x: 320, y: 138 },
    { x: 360, y: 80 },
    { x: 414, y: 118 },
    { x: 446, y: 56 },
    { x: 482, y: 30 }, // north star
  ],
  links: [
    [0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [4, 6], [6, 7],
    [7, 8], [8, 9], [8, 10], [10, 11],
    [2, 4], [5, 7], [9, 11],
  ] as [number, number][],
}

type LandingConstellationProps = {
  lit?: number
  theme?: 'light' | 'onblue'
  glow?: number
  pulse?: boolean
  accent?: string
  className?: string
}

export default function LandingConstellation({
  lit = 1,
  theme = 'light',
  glow = 0.62,
  pulse = false,
  accent = '#00C9A7',
  className = '',
}: LandingConstellationProps) {
  const { viewBox, nodes, links } = LANDING_CST
  const total = nodes.length
  const litCount = Math.max(0, Math.min(total, Math.round(lit * total)))
  const isBlue = theme === 'onblue'

  const dimStroke = isBlue ? 'rgba(255,255,255,0.16)' : 'rgba(7,112,186,0.16)'
  const dimNode = isBlue ? 'rgba(255,255,255,0.22)' : '#DCE9FF'
  const dimRing = isBlue ? 'rgba(255,255,255,0.32)' : 'rgba(7,112,186,0.26)'
  const litLine = isBlue ? 'rgba(255,255,255,0.5)' : 'rgba(7,112,186,0.5)'
  const litPath = isBlue ? '#FFFFFF' : '#0770BA'

  const isLit = (i: number) => i < litCount
  const uid = theme + (pulse ? 'p' : '')

  return (
    <svg className={`cst-svg ${className}`} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <filter id={`lglow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={3.2 * glow + 0.6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g>
        {links.map(([a, b], i) => {
          const on = isLit(a) && isLit(b)
          return (
            <line
              key={i}
              x1={nodes[a].x}
              y1={nodes[a].y}
              x2={nodes[b].x}
              y2={nodes[b].y}
              stroke={on ? litLine : dimStroke}
              strokeWidth={on ? 1.6 : 1}
              strokeLinecap="round"
            />
          )
        })}
      </g>

      <g>
        {nodes.map((n, i) => {
          const on = isLit(i)
          const isNorth = i === total - 1
          const r = isNorth ? 5.4 : 3.4
          return (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={r}
              fill={on ? (isNorth ? accent : litPath) : dimNode}
              stroke={on ? 'none' : dimRing}
              strokeWidth={on ? 0 : 1.1}
              filter={on ? `url(#lglow-${uid})` : undefined}
              className={on && pulse ? 'cst-node-pulse' : undefined}
              style={pulse && on ? { animationDelay: `${(i * 0.16).toFixed(2)}s`, transformOrigin: `${n.x}px ${n.y}px` } : undefined}
            />
          )
        })}
      </g>
    </svg>
  )
}
