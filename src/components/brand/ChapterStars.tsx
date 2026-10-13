// ChapterStars — the assessment's five-star progress map (one star per chapter), drawn in the Etijahi logomark's
// language (see Logomark.tsx): one fine gradient line rising through graded round nodes to a single haloed teal
// destination star. Here the path lights up chapter by chapter; the part not yet reached stays a quiet outline.
//
//   theme: 'dark' (on the navy assessment gradient) | 'teal' (on the light green chapter-complete screen)

import { useId } from 'react'

type Props = {
  litCount: number          // how many chapters are finished (stars lit)
  theme?: 'dark' | 'teal'
  rippleKey?: number        // changes on every advance, replays the arrival ripple on the newest star
  accent?: string           // the destination star (logo teal)
}

// Same silhouette as the logomark (rise, small dip, then the long climb to the star), stretched over five nodes.
const NODES = [
  { x: 48, y: 168 },
  { x: 114, y: 112 },
  { x: 186, y: 142 },
  { x: 262, y: 96 },
  { x: 340, y: 54 }, // destination star
]
// Node sizes step up along the path like the logo's 7 / 9 / 8 graded dots (same proportions as the logomark).
const NODE_R = [11, 14, 12.5, 15]

export default function ChapterStars({ litCount, theme = 'dark', rippleKey = 0, accent = '#00C9A7' }: Props) {
  const gid = useId()
  const total = NODES.length
  const lit = Math.max(0, Math.min(total, litCount))
  const frontier = lit - 1                 // newest lit star
  const next = lit < total ? lit : -1      // the star to earn next
  const dark = theme === 'dark'

  // Logo colours: white path on dark surfaces, brand blues on light ones; the destination is always the teal star.
  const path = dark ? '#FFFFFF' : '#0052CC'
  const mid = dark ? '#FFFFFF' : '#0091C2'
  const dim = dark ? 'rgba(255,255,255,0.30)' : 'rgba(0,82,204,0.28)'
  const dimFill = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,82,204,0.08)'

  const last = NODES[total - 1]
  const first = NODES[0]
  const litPoints = NODES.slice(0, Math.max(0, lit)).map(n => `${n.x},${n.y}`).join(' ')
  const fullPoints = NODES.map(n => `${n.x},${n.y}`).join(' ')

  return (
    <svg className="cst" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${gid}-line`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={path} />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <filter id={`${gid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* the whole route, quiet and dashed: where you are heading */}
      <polyline points={fullPoints} fill="none" stroke={dim} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

      {/* the part already travelled: the logo's gradient line */}
      {lit >= 2 && (
        <polyline points={litPoints} fill="none" stroke={`url(#${gid}-line)`} strokeWidth="7" strokeLinecap="round"
          strokeLinejoin="round" filter={`url(#${gid}-glow)`} style={{ transition: 'all .6s ease' }} />
      )}

      {/* graded nodes */}
      {NODES.slice(0, total - 1).map((n, i) => {
        const on = i < lit
        const r = NODE_R[i]
        return (
          <g key={i}>
            {i === next && (
              <circle cx={n.x} cy={n.y} r={r + 9} fill="none" stroke={path} strokeWidth="2.2" opacity=".65" className="cs-breathe" />
            )}
            {on && i === frontier && (
              <circle key={`rp-${rippleKey}`} cx={n.x} cy={n.y} r={r} fill="none" stroke={accent} strokeWidth="2"
                className="cst-ripple" style={{ animationDuration: '1.6s' }} />
            )}
            <circle cx={n.x} cy={n.y} r={r}
              fill={on ? (i === 2 ? mid : path) : dimFill}
              opacity={on ? 0.55 + i * 0.12 : 1}
              stroke={on ? 'none' : dim} strokeWidth={on ? 0 : 2.4}
              style={{ transition: 'fill .5s ease, opacity .5s ease' }} />
          </g>
        )
      })}

      {/* the destination star: a solid teal core inside a faint ring, exactly like the logo */}
      <g>
        {next === total - 1 && (
          <circle cx={last.x} cy={last.y} r={44} fill="none" stroke={accent} strokeWidth="2.2" opacity=".6" className="cs-breathe" />
        )}
        {lit === total && (
          <circle key={`rp-n-${rippleKey}`} cx={last.x} cy={last.y} r={22} fill="none" stroke={accent} strokeWidth="2.5"
            className="cst-ripple" style={{ animationDuration: '1.6s' }} />
        )}
        <circle cx={last.x} cy={last.y} r={34} fill="none" stroke={accent} strokeWidth="4.5" opacity={lit === total ? 0.45 : 0.25} />
        <circle cx={last.x} cy={last.y} r={22} fill={accent} opacity={lit === total ? 1 : 0.4}
          filter={lit === total ? `url(#${gid}-glow)` : undefined} style={{ transition: 'opacity .5s ease' }} />
      </g>
    </svg>
  )
}
