// ChapterStars — the assessment's progress map: five stars, one per chapter, drawn in the Etijahi logomark's language
// (see Logomark.tsx): one fine gradient line rising through graded round nodes to a single haloed teal star.
//
// The point of it is to be read as "how far am I": a small light (the person, tagged "You") travels along the path as
// they answer, the line fills behind it, a star ignites when its chapter is finished, and the next star carries its
// chapter's name. Progress is continuous: it moves a little with every question, not only at chapter ends.
//
//   theme: 'dark' (on the navy assessment gradient) | 'teal' (on the light green chapter-complete screen)

import { useId } from 'react'

type Props = {
  litCount: number          // chapters finished (stars lit)
  progress?: number         // 0..5 journey position: chapters finished + the fraction of the current one (default litCount)
  theme?: 'dark' | 'teal'
  rippleKey?: number        // changes on every advance, replays the arrival ripple on the newest star
  accent?: string           // the destination star (logo teal)
  youLabel?: string         // the tag on the travelling light ("You")
  nextLabel?: string        // the name of the star being travelled to ("Values")
}

// Same silhouette as the logomark (rise, small dip, then the long climb to the star): a start point, then five stars.
const START = { x: 12, y: 176 }
const NODES = [
  { x: 54, y: 148 },
  { x: 118, y: 98 },
  { x: 190, y: 128 },
  { x: 264, y: 82 },
  { x: 340, y: 44 }, // the north star (last chapter)
]
const POINTS = [START, ...NODES]
// Node sizes step up along the path like the logo's 7 / 9 / 8 graded dots (same proportions as the logomark).
const NODE_R = [11, 14, 12.5, 15]

// Cumulative length of the route, so the lit line and the travelling light share one position.
const SEG = POINTS.slice(1).map((p, i) => Math.hypot(p.x - POINTS[i].x, p.y - POINTS[i].y))
const TOTAL = SEG.reduce((a, b) => a + b, 0)

function along(progress: number) {
  const p = Math.max(0, Math.min(NODES.length, progress))
  const k = Math.min(SEG.length - 1, Math.floor(p))
  const t = p >= NODES.length ? 1 : p - k
  const a = POINTS[k], b = POINTS[k + 1]
  const dist = SEG.slice(0, k).reduce((s, v) => s + v, 0) + SEG[k] * t
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, frac: dist / TOTAL }
}

export default function ChapterStars({
  litCount, progress, theme = 'dark', rippleKey = 0, accent = '#00C9A7', youLabel, nextLabel,
}: Props) {
  const gid = useId()
  const total = NODES.length
  const lit = Math.max(0, Math.min(total, litCount))
  const frontier = lit - 1                 // newest lit star
  const next = lit < total ? lit : -1      // the star being travelled to
  const dark = theme === 'dark'
  const here = along(Math.max(progress ?? lit, lit))
  const arrived = lit >= total

  // Logo colours: white path on dark surfaces, brand blues on light ones; the destination is always the teal star.
  const path = dark ? '#FFFFFF' : '#0052CC'
  const mid = dark ? '#FFFFFF' : '#0091C2'
  const dim = dark ? 'rgba(255,255,255,0.30)' : 'rgba(0,82,204,0.28)'
  const dimFill = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,82,204,0.08)'
  const labelInk = dark ? 'rgba(255,255,255,0.95)' : '#07508a'
  const tagFill = dark ? '#FFFFFF' : '#0052CC'
  const tagInk = dark ? '#06407a' : '#FFFFFF'

  const last = NODES[total - 1]
  const routeD = 'M' + POINTS.map(p => `${p.x} ${p.y}`).join(' L')
  const DASH = 1000 // pathLength units

  return (
    <svg className="cst" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${gid}-line`} x1={START.x} y1={START.y} x2={last.x} y2={last.y} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={path} />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <filter id={`${gid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* the whole route, quiet: where you are heading */}
      <path d={routeD} fill="none" stroke={dim} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

      {/* the part already travelled: the logo's gradient line, filling as the light moves */}
      {here.frac > 0.002 && (
        <path d={routeD} pathLength={DASH} fill="none" stroke={`url(#${gid}-line)`} strokeWidth="7" strokeLinecap="round"
          strokeLinejoin="round" filter={`url(#${gid}-glow)`}
          strokeDasharray={`${Math.round(here.frac * DASH)} ${DASH}`}
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)' }} />
      )}

      {/* where it starts */}
      <circle cx={START.x} cy={START.y} r="5.5" fill={here.frac > 0.002 ? path : dimFill} stroke={dim} strokeWidth="1.8"
        opacity={here.frac > 0.002 ? 0.7 : 1} />

      {/* graded nodes: a star per chapter */}
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
        {arrived && (
          <circle key={`rp-n-${rippleKey}`} cx={last.x} cy={last.y} r={22} fill="none" stroke={accent} strokeWidth="2.5"
            className="cst-ripple" style={{ animationDuration: '1.6s' }} />
        )}
        <circle cx={last.x} cy={last.y} r={34} fill="none" stroke={accent} strokeWidth="4.5" opacity={arrived ? 0.45 : 0.25} />
        <circle cx={last.x} cy={last.y} r={22} fill={accent} opacity={arrived ? 1 : 0.4}
          filter={arrived ? `url(#${gid}-glow)` : undefined} style={{ transition: 'opacity .5s ease' }} />
      </g>

      {/* name of the star you are heading to */}
      {next >= 0 && nextLabel && (() => {
        // Placed off the route: above-left of the star (the path arrives from the lower-left and leaves up-right);
        // the dip star sits in a V, its name goes straight above it in the open gap; the north star's name goes to its
        // left. The "You" tag sits below-right of the light, so the two never meet.
        const n = NODES[next], r = next === total - 1 ? 34 : NODE_R[next]
        const pos = next === total - 1
          ? { x: n.x - r - 12, y: n.y + 4, anchor: 'end' as const }
          : next === 2
            ? { x: n.x, y: n.y - r - 22, anchor: 'middle' as const }
            : { x: n.x - 14, y: n.y - r - 20, anchor: 'middle' as const }
        return (
          <text x={pos.x} y={pos.y} textAnchor={pos.anchor} fontSize="13" fontWeight="700" fill={labelInk}
            style={{ letterSpacing: '.02em' }}>
            {nextLabel}
          </text>
        )
      })()}

      {/* you: a light that travels the path (hidden once the last star is reached) */}
      {!arrived && (
        <g style={{ transform: `translate(${here.x}px, ${here.y}px)`, transition: 'transform .8s cubic-bezier(.4,0,.2,1)' }}>
          <circle r="16" fill="none" stroke={accent} strokeWidth="2" opacity=".55" className="cs-breathe" />
          <circle r="7.5" fill={tagFill} stroke={accent} strokeWidth="3" filter={`url(#${gid}-glow)`} />
          {youLabel && (
            <g transform="translate(34 24)">
              <rect x="-24" y="-11" width="48" height="22" rx="11" fill={tagFill} />
              <text y="4.5" textAnchor="middle" fontSize="12" fontWeight="800" fill={tagInk}>{youLabel}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  )
}
