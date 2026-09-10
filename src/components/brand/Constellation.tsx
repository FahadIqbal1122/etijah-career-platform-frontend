// Constellation — the signature "personality constellation". A sparse star-map
// that gains lit nodes as you progress; the frontier node ripples on a reveal.
// Ported from Design/src/constellation.jsx (+ geometry from content.jsx).
//
//   theme: 'dark' (on the navy assessment gradient) | 'teal' (on the reveal takeover)

import { useRef } from 'react'

// A sparse asterism rising from lower-left to a bright "north star" at the
// upper-right — ufuq (أفق) = horizon.
export const CONSTELLATION = {
  viewBox: '0 0 375 150',
  nodes: [
    { x: 34, y: 120 },
    { x: 74, y: 96 },
    { x: 116, y: 110 },
    { x: 150, y: 70 },
    { x: 196, y: 88 },
    { x: 236, y: 52 },
    { x: 290, y: 74 },
    { x: 338, y: 30 }, // north star
  ],
  links: [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
    [1, 3], [4, 6],
  ] as [number, number][],
}

type ConstellationProps = {
  litCount: number
  theme?: 'dark' | 'teal'
  rippleKey?: number
  motion?: number
  accent?: string
}

export default function Constellation({
  litCount,
  theme = 'dark',
  rippleKey = 0,
  motion = 1,
  accent = '#00C9A7',
}: ConstellationProps) {
  const { viewBox, nodes, links } = CONSTELLATION
  const total = nodes.length
  const lit = Math.max(0, Math.min(total, litCount))
  const frontier = lit - 1

  const isTeal = theme === 'teal'
  const dimStroke = isTeal ? 'rgba(7,112,186,0.22)' : 'rgba(255,255,255,0.16)'
  const dimNode = isTeal ? 'rgba(7,112,186,0.30)' : 'rgba(255,255,255,0.22)'
  const dimRing = isTeal ? 'rgba(7,112,186,0.45)' : 'rgba(255,255,255,0.35)'
  const litStroke = isTeal ? 'rgba(7,112,186,0.55)' : 'rgba(255,255,255,0.6)'
  const litPath = isTeal ? '#0770BA' : '#FFFFFF' // rising path nodes
  const litDest = isTeal ? '#0770BA' : accent // destination / north star

  const isLit = (i: number) => i < lit
  const dur = (s: number) => `${(s / Math.max(0.4, motion)).toFixed(2)}s`

  // Tracks the previously-rendered frontier (no effect needed — refs are exempt
  // from render purity, this is the standard "remember the last value" pattern)
  // so a comet of light can fly along the specific edge just crossed, instead of
  // the node itself scaling/"popping" in place — that read as the star jumping
  // out of position rather than progress arriving at it.
  const prevFrontierRef = useRef(frontier)
  const arrivedFrom = prevFrontierRef.current
  const cometDur = 0.55
  const hasDirectEdge = links.some(([a, b]) => (a === arrivedFrom && b === frontier) || (a === frontier && b === arrivedFrom))
  const showComet = frontier > 0 && frontier !== arrivedFrom && hasDirectEdge
  prevFrontierRef.current = frontier

  return (
    <svg className="cst" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <filter id={`glow-${theme}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Brand-colored travel light: a bright core fading through teal into
            primary blue, rather than a plain white dot. */}
        <radialGradient id={`comet-${theme}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0FFFC" stopOpacity="1" />
          <stop offset="45%" stopColor={isTeal ? '#0770BA' : accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={isTeal ? '#00C9A7' : '#188BDC'} stopOpacity="0" />
        </radialGradient>
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
              stroke={on ? litStroke : dimStroke}
              strokeWidth={on ? 1.4 : 0.8}
              strokeLinecap="round"
              style={{ transition: `stroke ${dur(0.6)} ease` }}
            />
          )
        })}
      </g>

      <g>
        {nodes.map((n, i) => {
          const on = isLit(i)
          const isFrontier = i === frontier
          const isNorth = i === total - 1
          const r = isNorth ? 4.2 : 3
          const fill = on ? (isNorth ? litDest : litPath) : dimNode
          return (
            <g key={i}>
              {on && isFrontier && (
                <circle
                  key={`rp-${rippleKey}`}
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill="none"
                  stroke={isTeal ? '#0770BA' : accent}
                  strokeWidth="1.4"
                  className="cst-ripple"
                  // Held back until the comet (if any) actually lands, so the
                  // sequence reads as light-arrives-then-star-flashes rather
                  // than both firing at once.
                  style={{ animationDuration: dur(1.6), animationDelay: showComet ? dur(cometDur) : '0s' }}
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill={fill}
                stroke={on ? 'none' : dimRing}
                strokeWidth={on ? 0 : 1}
                filter={on ? `url(#glow-${theme})` : undefined}
                style={{
                  transition: `fill ${dur(0.5)} ease`,
                  opacity: on ? 1 : 0.9,
                  transformOrigin: `${n.x}px ${n.y}px`,
                }}
              />
            </g>
          )
        })}
      </g>

      {showComet && (
        <circle
          key={`comet-${rippleKey}`}
          r={3}
          fill={`url(#comet-${theme})`}
          filter={`url(#glow-${theme})`}
          // Fades out shortly after landing — it can stay mounted for a while
          // (nothing else forces a re-render until the next question), and a
          // duplicate bright dot frozen on the star would otherwise look like
          // clutter rather than a light that arrived and settled.
          style={{ animation: `cstCometFade ${dur(cometDur + 0.5)} ease forwards` }}
        >
          <animateMotion
            dur={dur(cometDur)}
            fill="freeze"
            path={`M${nodes[arrivedFrom].x},${nodes[arrivedFrom].y} L${nodes[frontier].x},${nodes[frontier].y}`}
          />
        </circle>
      )}
    </svg>
  )
}
