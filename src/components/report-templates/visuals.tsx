'use client'

import type { ReportTemplateData } from './types'
import { clampScore } from './parts'

// The two graphics the templates can add to the report: the interests hexagon and the career constellation.
// They only draw what the page already shows to that person (the careers it was given, the six interest scores).

const NODES: [number, number][] = [[40, 430], [110, 360], [190, 390], [260, 300], [330, 320], [400, 220], [470, 250], [540, 80]]
const HEX_ORDER = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional']

export function Constellation({ data, unlockedLabel, lowestLabel, tone = 'dark' }: { data: ReportTemplateData; unlockedLabel: string; lowestLabel: string; full?: boolean; tone?: 'dark' | 'light' }) {
  const full = false
  const ar = data.locale === 'ar'
  const light = tone === 'light'
  const labelFill = light ? '#4d5056' : '#b9cfe3'
  const nodeFill = light ? '#0770ba' : '#9cc7e8'
  const accent = light ? '#0a705a' : '#00c9a7'
  const sorted = [...data.careers].sort((a, b) => b.match - a.match)
  const lowest = sorted.find(c => c.risk === 'low')?.title
  const count = Math.min(sorted.length, NODES.length)
  // lowest match at the bottom-left, best at the top-right
  const pts = sorted.slice(0, count).reverse().map((c, i) => ({ c, xy: NODES[NODES.length - count + i] }))
  const best = pts[pts.length - 1]
  const short = (s: string) => (s.length > 24 ? `${s.slice(0, 23)}…` : s)
  if (!best) return null
  const path = pts.map(({ xy }, i) => `${i ? 'L' : 'M'}${xy[0]} ${xy[1]}`).join(' ')
  return (
    <svg viewBox="0 0 600 470" width="100%" role="img" aria-label={`${data.careers.length} careers`} style={{ display: 'block', fontFamily: 'inherit' }}>
      <path d={path} stroke={nodeFill} strokeOpacity={light ? 0.4 : 0.35} strokeWidth={2} strokeDasharray="3 7" fill="none" strokeLinecap="round" />
      {pts.length > 1 && <path d={`M${pts[pts.length - 2].xy[0]} ${pts[pts.length - 2].xy[1]} L${best.xy[0]} ${best.xy[1]}`} stroke="#00c9a7" strokeWidth={3} fill="none" strokeLinecap="round" />}
      {pts.slice(0, -1).map(({ c, xy }, i) => {
        const [x, y] = xy
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={full ? 9 : 6 + Math.min(3, i / 2)} fill={full ? '#00c9a7' : nodeFill} fillOpacity={full ? 0.9 : (light ? 0.5 : 0.55) + Math.min(0.25, i * 0.04)} />
            <text x={ar ? x - 16 : x + 16} y={y + 22} textAnchor={ar ? 'end' : 'start'} fill={labelFill} fontSize={14}>{short(c.title)} · {clampScore(c.match)}%</text>
            {lowest && c.title === lowest && <text x={ar ? x - 16 : x + 16} y={y + 40} textAnchor={ar ? 'end' : 'start'} fill={accent} fontSize={12} fontWeight={700}>{lowestLabel}</text>}
          </g>
        )
      })}
      <circle cx={best.xy[0]} cy={best.xy[1]} r={40} fill="#00c9a7" fillOpacity={0.12} />
      <circle cx={best.xy[0]} cy={best.xy[1]} r={26} fill="none" stroke="#00c9a7" strokeWidth={2} strokeOpacity={0.5} />
      <circle cx={best.xy[0]} cy={best.xy[1]} r={15} fill="#00c9a7" />
      <text x={best.xy[0] + 40} y={best.xy[1] - 46} textAnchor="end" fill={light ? '#1f2a37' : '#fff'} fontSize={20} fontWeight={800}>{short(best.c.title)}</text>
      <text x={best.xy[0] + 40} y={best.xy[1] - 24} textAnchor="end" fill={accent} fontSize={15} fontWeight={700}>{clampScore(best.c.match)}% · {unlockedLabel}</text>
    </svg>
  )
}

export function Hexagon({ data }: { data: ReportTemplateData }) {
  const R = 130, cx = 160, cy = 160
  const byKey = (k: string, i: number) => data.riasec.find(r => r.key === k) || data.riasec[i]
  const items = HEX_ORDER.map((k, i) => byKey(k, i)).filter(Boolean)
  const maxScore = Math.max(...items.map(r => r.score))
  const pt = (i: number, f: number) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180
    return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)] as const
  }
  const ring = (f: number) => HEX_ORDER.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(',')).join(' ')
  const shape = items.map((r, i) => pt(i, Math.max(0.04, clampScore(r.score) / 100)).map(v => v.toFixed(1)).join(',')).join(' ')
  const anchor = (i: number) => (i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end')
  return (
    <svg viewBox="-60 -24 440 368" width={280} height={240} role="img" style={{ flex: '0 0 auto', maxWidth: '100%', fontFamily: 'inherit' }}
      aria-label={items.map(r => `${r.label} ${clampScore(r.score)}`).join(', ')}>
      <polygon points={ring(1)} fill="#f4f9ff" stroke="#9cc7e8" strokeWidth={1} />
      <polygon points={ring(0.667)} fill="none" stroke="#d3e5f4" strokeWidth={1} />
      <polygon points={ring(0.333)} fill="none" stroke="#d3e5f4" strokeWidth={1} />
      <polygon points={shape} fill="#0770ba" fillOpacity={0.18} stroke="#0770ba" strokeWidth={2.5} strokeLinejoin="round" />
      {items.map((r, i) => {
        const [x, y] = pt(i, Math.max(0.04, clampScore(r.score) / 100))
        const [lx, ly] = pt(i, 1.18)
        const hi = r.score === maxScore
        return (
          <g key={r.label}>
            <circle cx={x} cy={y} r={hi ? 6 : 4.5} fill={hi ? '#00c9a7' : '#0770ba'} />
            <text x={lx} y={ly + (i === 0 ? -2 : i === 3 ? 12 : 5)} textAnchor={anchor(i)} fill={hi ? '#075288' : '#545968'} fontSize={15} fontWeight={hi ? 800 : 700}>{r.label} {clampScore(r.score)}</text>
          </g>
        )
      })}
    </svg>
  )
}
