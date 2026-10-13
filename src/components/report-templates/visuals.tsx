'use client'

import type { ReportTemplateData } from './types'
import { clampScore } from './parts'

// The two graphics of the Constellation design: the interests hexagon and the career constellation.

const HEX_ORDER = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional']

// The career constellation: a clean rising staircase. One row per career, best at the top right; the name sits in
// its own row to the left of its star, right-aligned, so nothing overlaps however many careers there are.
// Careers that are locked on this plan are dim stars with a placeholder bar.
export function Constellation({ data, unlockedLabel, lowestLabel, lockedLabel, tone = 'dark' }: {
  data: ReportTemplateData; unlockedLabel: string; lowestLabel: string; lockedLabel: string; tone?: 'dark' | 'light'
}) {
  const light = tone === 'light'
  const nameFill = light ? '#1f2a37' : '#ffffff'
  const metaFill = light ? '#4d5056' : '#b9cfe3'
  const nodeFill = light ? '#0770ba' : '#9cc7e8'
  const accent = light ? '#0a705a' : '#00c9a7'
  // the page's order (best first), without the careers the person marked "not for me"
  const named = data.careers.filter(c => !c.rejected).slice(0, 8)
  const lockedCount = Math.max(0, Math.min(8 - named.length, data.lockedMore))
  const total = named.length + lockedCount
  if (!named.length) return null
  const lowestTitle = named.find(c => c.risk === 'low')?.title
  const short = (s: string) => (s.length > 26 ? `${s.slice(0, 25)}…` : s)

  // rows from the top (best) down; the best one gets a taller row for its two-line label
  const X_RIGHT = 548, X_LEFT = 300
  const rows = Array.from({ length: total }, (_, k) => ({
    k,
    x: total === 1 ? X_RIGHT : X_RIGHT - (k * (X_RIGHT - X_LEFT)) / (total - 1),
    y: 56 + (k === 0 ? 0 : 66 + (k - 1) * 58),
  }))
  const height = rows[rows.length - 1].y + 52
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${r.x} ${r.y}`).join(' ')
  const firstLocked = named.length

  return (
    <svg viewBox={`0 0 600 ${height}`} width="100%" role="img" aria-label={named.map(c => `${c.title} ${Math.round(c.match)}%`).join(', ')} style={{ display: 'block', fontFamily: 'inherit', direction: 'ltr' }}>
      <path d={path} stroke={nodeFill} strokeOpacity={light ? 0.4 : 0.35} strokeWidth={2} strokeDasharray="3 7" fill="none" strokeLinecap="round" />
      {rows.length > 1 && <path d={`M${rows[1].x} ${rows[1].y} L${rows[0].x} ${rows[0].y}`} stroke="#00c9a7" strokeWidth={3} fill="none" strokeLinecap="round" />}
      {rows.map(r => {
        const c = named[r.k]
        const lx = r.x - 24
        if (r.k === 0) {
          return (
            <g key={r.k}>
              <circle cx={r.x} cy={r.y} r={40} fill="#00c9a7" fillOpacity={0.14} />
              <circle cx={r.x} cy={r.y} r={26} fill="none" stroke="#00c9a7" strokeWidth={2} strokeOpacity={0.5} />
              <circle cx={r.x} cy={r.y} r={15} fill="#00c9a7" />
              <text x={r.x - 52} y={r.y - 2} textAnchor="end" fill={nameFill} fontSize={26} fontWeight={800}>{short(c.title)}</text>
              <text x={r.x - 52} y={r.y + 26} textAnchor="end" fill={accent} fontSize={18} fontWeight={700}>{Math.round(c.match)}% · {unlockedLabel}</text>
            </g>
          )
        }
        if (c) {
          return (
            <g key={r.k}>
              <circle cx={r.x} cy={r.y} r={10} fill={nodeFill} fillOpacity={0.75} />
              <text x={lx} y={r.y + 6} textAnchor="end" fill={nameFill} fontSize={19} fontWeight={600}>{short(c.title)} <tspan fill={metaFill} fontWeight={500}>· {Math.round(c.match)}%</tspan></text>
              {c.title === lowestTitle && <text x={lx} y={r.y + 26} textAnchor="end" fill={accent} fontSize={13} fontWeight={700}>{lowestLabel}</text>}
            </g>
          )
        }
        // locked on this plan: a dim star and a placeholder bar (the name is not shown)
        return (
          <g key={r.k}>
            <circle cx={r.x} cy={r.y} r={8} fill={nodeFill} fillOpacity={0.28} />
            <rect x={lx - 130} y={r.y - 7} width={130} height={14} rx={7} fill={nodeFill} fillOpacity={0.14} />
            {r.k === firstLocked && <text x={lx - 144} y={r.y + 6} textAnchor="end" fill={metaFill} fontSize={16}>{lockedLabel}</text>}
          </g>
        )
      })}
    </svg>
  )
}

export function Hexagon({ data }: { data: ReportTemplateData }) {
  const R = 130, cx = 160, cy = 160
  const items = HEX_ORDER.map((k, i) => data.riasec.find(r => r.key === k) || data.riasec[i]).filter(Boolean) as Array<{ key?: string; label: string; score?: number }>
  // no scores (or only some): no graph, rather than a collapsed shape of zeros
  if (items.length < 6 || items.some(r => typeof r.score !== 'number')) return null
  const maxScore = Math.max(...items.map(r => r.score as number))
  const pt = (i: number, f: number) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180
    return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)] as const
  }
  const ring = (f: number) => HEX_ORDER.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(',')).join(' ')
  const f = (r: { score?: number }) => Math.max(0.04, clampScore(r.score ?? 0) / 100)
  const shape = items.map((r, i) => pt(i, f(r)).map(v => v.toFixed(1)).join(',')).join(' ')
  const anchor = (i: number) => (i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end')
  return (
    <svg viewBox="-130 -24 580 368" width={380} height={241} role="img" style={{ flex: '0 0 auto', maxWidth: '100%', fontFamily: 'inherit', direction: 'ltr' }}
      aria-label={items.map(r => `${r.label} ${clampScore(r.score ?? 0)}`).join(', ')}>
      <polygon points={ring(1)} fill="#f4f9ff" stroke="#9cc7e8" strokeWidth={1} />
      <polygon points={ring(0.667)} fill="none" stroke="#d3e5f4" strokeWidth={1} />
      <polygon points={ring(0.333)} fill="none" stroke="#d3e5f4" strokeWidth={1} />
      <polygon points={shape} fill="#0770ba" fillOpacity={0.18} stroke="#0770ba" strokeWidth={2.5} strokeLinejoin="round" />
      {items.map((r, i) => {
        const [x, y] = pt(i, f(r))
        const [lx, ly] = pt(i, 1.18)
        const hi = r.score === maxScore
        return (
          <g key={r.label}>
            <circle cx={x} cy={y} r={hi ? 6 : 4.5} fill={hi ? '#00c9a7' : '#0770ba'} />
            <text x={lx} y={ly + (i === 0 ? -2 : i === 3 ? 12 : 5)} textAnchor={anchor(i)} fill={hi ? '#075288' : '#545968'} fontSize={15} fontWeight={hi ? 800 : 700}>{r.label} {clampScore(r.score ?? 0)}</text>
          </g>
        )
      })}
    </svg>
  )
}
