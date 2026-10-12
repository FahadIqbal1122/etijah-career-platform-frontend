'use client'

import type { ReportTemplateData } from './types'
import { clampScore } from './parts'

// The two graphics of the Constellation design: the interests hexagon and the career constellation.

// ascending zig-zag from the bottom-left to the top-right (the logo's rising line)
const NODES: [number, number][] = [[40, 430], [110, 360], [190, 390], [260, 300], [330, 320], [400, 220], [470, 250], [540, 80]]
const HEX_ORDER = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional']

export function Constellation({ data, unlockedLabel, lowestLabel, lockedLabel, tone = 'dark' }: {
  data: ReportTemplateData; unlockedLabel: string; lowestLabel: string; lockedLabel: string; tone?: 'dark' | 'light'
}) {
  const ar = data.locale === 'ar'
  const light = tone === 'light'
  const labelFill = light ? '#4d5056' : '#b9cfe3'
  const nodeFill = light ? '#0770ba' : '#9cc7e8'
  const accent = light ? '#0a705a' : '#00c9a7'
  const named = [...data.careers].sort((a, b) => b.match - a.match)
  const total = Math.max(1, Math.min(NODES.length, named.length + data.lockedMore))
  const shownNamed = named.slice(0, total)
  const lockedCount = total - shownNamed.length
  // spread the stars along the whole line, however many there are
  const slots = total === 1 ? [NODES.length - 1] : Array.from({ length: total }, (_, i) => Math.round((i * (NODES.length - 1)) / (total - 1)))
  // ascending (bottom-left first): the locked ones are the lowest ranks, then the named ones from the lowest up
  const items: Array<{ c?: typeof named[number]; xy: [number, number] }> = [
    ...Array.from({ length: lockedCount }, () => ({ c: undefined })),
    ...[...shownNamed].reverse().map(c => ({ c })),
  ].map((it, i) => ({ ...it, xy: NODES[slots[i]] }))
  const best = items[items.length - 1]
  if (!best || !best.c) return null
  const lowestTitle = shownNamed.find(c => c.risk === 'low')?.title
  const short = (s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s)
  const path = items.map(({ xy }, i) => `${i ? 'L' : 'M'}${xy[0]} ${xy[1]}`).join(' ')
  const prev = items[items.length - 2]
  const lockedItems = items.filter(i => !i.c)
  return (
    <svg viewBox="0 0 600 470" width="100%" role="img" aria-label={`${total}`} style={{ display: 'block', fontFamily: 'inherit', overflow: 'visible' }}>
      <path d={path} stroke={nodeFill} strokeOpacity={light ? 0.45 : 0.4} strokeWidth={2} strokeDasharray="3 7" fill="none" strokeLinecap="round" />
      {prev && <path d={`M${prev.xy[0]} ${prev.xy[1]} L${best.xy[0]} ${best.xy[1]}`} stroke="#00c9a7" strokeWidth={3} fill="none" strokeLinecap="round" />}
      {items.slice(0, -1).map(({ c, xy }, i) => {
        const [x, y] = xy
        if (!c) return <circle key={i} cx={x} cy={y} r={6} fill={nodeFill} fillOpacity={0.28} />
        // names on the right half sit to the left of the star so they never run off the picture
        const left = x > 360
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={8} fill={nodeFill} fillOpacity={light ? 0.6 : 0.7} />
            <text x={left ? x - 16 : x + 16} y={left ? y + 5 : y + 24} textAnchor={left ? 'end' : 'start'} fill={labelFill} fontSize={15}>{short(c.title)} · {clampScore(c.match)}%</text>
            {c.title === lowestTitle && <text x={left ? x - 16 : x + 16} y={left ? y + 23 : y + 42} textAnchor={left ? 'end' : 'start'} fill={accent} fontSize={12} fontWeight={700}>{lowestLabel}</text>}
          </g>
        )
      })}
      {lockedItems.length > 0 && (
        <text x={lockedItems[0].xy[0]} y={lockedItems[0].xy[1] + 28} textAnchor="start" fill={labelFill} fontSize={14}>{lockedLabel}</text>
      )}
      <circle cx={best.xy[0]} cy={best.xy[1]} r={40} fill="#00c9a7" fillOpacity={0.14} />
      <circle cx={best.xy[0]} cy={best.xy[1]} r={26} fill="none" stroke="#00c9a7" strokeWidth={2} strokeOpacity={0.5} />
      <circle cx={best.xy[0]} cy={best.xy[1]} r={15} fill="#00c9a7" />
      <text x={ar ? best.xy[0] + 40 : best.xy[0] + 40} y={best.xy[1] - 50} textAnchor="end" fill={light ? '#1f2a37' : '#fff'} fontSize={20} fontWeight={800}>{short(best.c.title)}</text>
      <text x={best.xy[0] + 40} y={best.xy[1] - 28} textAnchor="end" fill={accent} fontSize={15} fontWeight={700}>{clampScore(best.c.match)}% · {unlockedLabel}</text>
    </svg>
  )
}

export function Hexagon({ data }: { data: ReportTemplateData }) {
  const R = 130, cx = 160, cy = 160
  const items = HEX_ORDER.map((k, i) => data.riasec.find(r => r.key === k) || data.riasec[i]).filter(Boolean)
  if (items.length < 6) return null
  const maxScore = Math.max(...items.map(r => r.score))
  const pt = (i: number, f: number) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180
    return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)] as const
  }
  const ring = (f: number) => HEX_ORDER.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(',')).join(' ')
  const f = (r: { score: number }) => Math.max(0.04, clampScore(r.score) / 100)
  const shape = items.map((r, i) => pt(i, f(r)).map(v => v.toFixed(1)).join(',')).join(' ')
  const anchor = (i: number) => (i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end')
  return (
    <svg viewBox="-70 -24 460 368" width={300} height={240} role="img" style={{ flex: '0 0 auto', maxWidth: '100%', fontFamily: 'inherit' }}
      aria-label={items.map(r => `${r.label} ${clampScore(r.score)}`).join(', ')}>
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
            <text x={lx} y={ly + (i === 0 ? -2 : i === 3 ? 12 : 5)} textAnchor={anchor(i)} fill={hi ? '#075288' : '#545968'} fontSize={15} fontWeight={hi ? 800 : 700}>{r.label} {clampScore(r.score)}</text>
          </g>
        )
      })}
    </svg>
  )
}
