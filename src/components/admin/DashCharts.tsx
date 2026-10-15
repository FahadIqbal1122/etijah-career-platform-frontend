'use client'

// Small dependency-free SVG/HTML charts for the admin dashboard.
// Colors: the validated categorical palette (fixed order, color follows the
// entity — never its rank) and a single-hue blue ramp for magnitude.
import { useState } from 'react'

export const CAT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const OVERFLOW_COLOR = '#94a3b8'
const REMAINDER_COLOR = '#e2e8f0'
const BLUE_LIGHT = '#86b6ef'
const BLUE_DARK = '#184f95'

export function catColor(index: number): string {
  return index < CAT_COLORS.length ? CAT_COLORS[index] : OVERFLOW_COLOR
}

const pctOf = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

export type ChartItem = { key: string; label: string; value: number; color?: string }

// ── Donut ────────────────────────────────────────────────────────────────────
// Share-of-whole for a handful of categories. `total` is the denominator; if it
// is larger than the sum of the slices the remainder is drawn as "Not provided".
export function DonutChart({ items, total, centerLabel = 'responses', onSelect }: { items: ChartItem[]; total: number; centerLabel?: string; onSelect?: (key: string) => void }) {
  const [hover, setHover] = useState<string | null>(null)
  const sum = items.reduce((a, i) => a + i.value, 0)
  const denom = Math.max(total, sum)
  const remainder = Math.max(0, denom - sum)
  const slices = [
    ...items.filter(i => i.value > 0),
    ...(remainder > 0 ? [{ key: '__rest', label: 'Not provided', value: remainder, color: REMAINDER_COLOR }] : []),
  ]
  const R = 40
  const C = 2 * Math.PI * R
  let offset = 0
  const active = slices.find(s => s.key === hover)
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <svg viewBox="0 0 120 120" className="w-36 h-36 shrink-0" role="img" aria-label="Donut chart">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f5f9" strokeWidth="16" />
        {denom > 0 && slices.map(s => {
          const len = (s.value / denom) * C
          const gap = slices.length > 1 ? 2 : 0
          const el = (
            <circle
              key={s.key}
              cx="60" cy="60" r={R} fill="none"
              stroke={s.color || '#2a78d6'}
              strokeWidth={hover === s.key ? 19 : 16}
              strokeDasharray={`${Math.max(len - gap, 0.5)} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              onClick={() => { if (s.key !== '__rest') onSelect?.(s.key) }}
              style={{ transition: 'stroke-width 120ms', cursor: onSelect && s.key !== '__rest' ? 'pointer' : 'default' }}
            >
              <title>{`${s.label}: ${s.value} (${pctOf(s.value, denom)}%)`}</title>
            </circle>
          )
          offset += len
          return el
        })}
        <text x="60" y="58" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 17, fontWeight: 700 }}>
          {active ? `${pctOf(active.value, denom)}%` : denom}
        </text>
        <text x="60" y="73" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 8 }}>
          {active ? (active.label.length > 18 ? `${active.label.slice(0, 17)}…` : active.label) : centerLabel}
        </text>
      </svg>
      <ul className="flex-1 min-w-[150px] space-y-1.5">
        {slices.map(s => (
          <li
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            onClick={() => { if (s.key !== '__rest') onSelect?.(s.key) }}
            // className={`flex items-center gap-2 text-xs rounded-md px-1.5 py-0.5 transition-colors ${onSelect && s.key !== '__rest' ? 'cursor-pointer' : ''} ${hover === s.key ? 'bg-slate-50' : ''}`}
            className={`flex items-start gap-2 text-xs rounded-md px-1.5 py-0.5 transition-colors ${onSelect && s.key !== '__rest' ? 'cursor-pointer' : ''} ${hover === s.key ? 'bg-slate-50' : ''}`}
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[3px]" style={{ background: s.color || '#2a78d6' }} />
            {/* <span className="text-slate-600 flex-1 truncate" title={s.label}>{s.label}</span> */}
            <span className="text-slate-600 flex-1 min-w-0 break-words leading-snug" title={s.label}>{s.label}</span>
            <span className="font-semibold text-slate-800 tabular-nums">{pctOf(s.value, denom)}%</span>
            <span className="text-slate-400 tabular-nums w-8 text-right">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Column ───────────────────────────────────────────────────────────────────
// Ordered categories (age groups, stages). Emphasis form: the tallest column in
// the dark step, the rest in the light step.
export function ColumnChart({ items, total, height = 120, onSelect }: { items: ChartItem[]; total: number; height?: number; onSelect?: (key: string) => void }) {
  const max = Math.max(1, ...items.map(i => i.value))
  const top = items.reduce((m, i) => (i.value > m.value ? i : m), items[0])
  return (
    <div className="flex items-end gap-1.5" style={{ minHeight: height + 44 }}>
      {items.map(i => {
        const h = i.value > 0 ? Math.max(4, Math.round((i.value / max) * height)) : 2
        const isTop = top && i.key === top.key && i.value > 0
        return (
          <div key={i.key} onClick={() => { if (i.value > 0) onSelect?.(i.key) }} className={`flex-1 min-w-0 flex flex-col items-center justify-end gap-1 group${onSelect && i.value > 0 ? ' cursor-pointer' : ''}`} title={`${i.label}: ${i.value} (${pctOf(i.value, total)}%)`}>
            <span className="text-[10px] font-semibold text-slate-700 tabular-nums leading-none">{pctOf(i.value, total)}%</span>
            <div
              className="w-full max-w-[44px] rounded-t-md transition-opacity group-hover:opacity-80"
              style={{ height: h, background: i.value === 0 ? '#e2e8f0' : isTop ? BLUE_DARK : BLUE_LIGHT }}
            />
            <span className="text-[10px] text-slate-500 text-center leading-tight w-full truncate">{i.label}</span>
            <span className="text-[10px] text-slate-400 tabular-nums leading-none">{i.value}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Time series (line or column) ─────────────────────────────────────────────
export function TrendChart({ points, kind = 'line', color = '#2a78d6', unit = '', onSelect }: {
  points: { label: string; value: number }[]
  kind?: 'line' | 'column'
  color?: string
  unit?: string
  onSelect?: (index: number) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 600, H = 190, PL = 34, PR = 12, PT = 14, PB = 26
  const n = points.length
  const rawMax = Math.max(1, ...points.map(p => p.value))
  const step = rawMax <= 5 ? 1 : rawMax <= 20 ? 5 : rawMax <= 100 ? 10 : Math.pow(10, Math.floor(Math.log10(rawMax)))
  const max = Math.ceil(rawMax / step) * step
  const iw = W - PL - PR, ih = H - PT - PB
  const x = (i: number) => PL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const colW = n > 0 ? iw / n : iw
  const cx = (i: number) => PL + colW * i + colW / 2
  const y = (v: number) => PT + ih - (v / max) * ih
  // Whole-number gridlines only: a max of 1 would otherwise show 0, 0.5 (rounded to a second "1"), 1.
  const ticks = [0, max / 2, max].filter(Number.isInteger)
  const labelIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1]
  const px = (i: number) => (kind === 'line' ? x(i) : cx(i))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = n > 1 ? `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : ''
  const hp = hover != null ? points[hover] : null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Trend chart"
      style={{ cursor: onSelect ? 'pointer' : undefined }}
      onClick={() => { if (onSelect && hover != null && points[hover]?.value > 0) onSelect(hover) }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        const rel = ((e.clientX - r.left) / r.width) * W
        const idx = kind === 'line'
          ? Math.round(((rel - PL) / iw) * (n - 1))
          : Math.floor((rel - PL) / colW)
        setHover(n > 0 ? Math.min(n - 1, Math.max(0, idx)) : null)
      }}
    >
      {ticks.map(t => (
        <g key={t}>
          <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={t === 0 ? undefined : '3 4'} />
          <text x={PL - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-400" style={{ fontSize: 10 }}>{Math.round(t)}</text>
        </g>
      ))}
      {labelIdx.map(i => points[i] && (
        <text key={i} x={px(i)} y={H - 8} textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'} className="fill-slate-400" style={{ fontSize: 10 }}>
          {points[i].label}
        </text>
      ))}
      {kind === 'line' ? (
        <>
          {area && <path d={area} fill={color} opacity="0.12" />}
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {n > 0 && <circle cx={x(n - 1)} cy={y(points[n - 1].value)} r="4" fill={color} stroke="#fff" strokeWidth="2" />}
        </>
      ) : (
        points.map((p, i) => {
          const h = (p.value / max) * ih
          return (
            <rect key={i} x={cx(i) - Math.max(1, colW / 2 - 1.5)} y={y(p.value)} width={Math.max(2, colW - 3)} height={Math.max(p.value > 0 ? 2 : 0, h)}
              rx="3" fill={color} opacity={hover == null || hover === i ? 1 : 0.45} />
          )
        })
      )}
      {hp && hover != null && (
        <g pointerEvents="none">
          <line x1={px(hover)} x2={px(hover)} y1={PT} y2={PT + ih} stroke="#94a3b8" strokeWidth="1" />
          {kind === 'line' && <circle cx={x(hover)} cy={y(hp.value)} r="4" fill={color} stroke="#fff" strokeWidth="2" />}
          <g transform={`translate(${Math.min(Math.max(px(hover) - 55, PL), W - PR - 110)},${PT - 2})`}>
            <rect width="110" height="36" rx="8" fill="#0f172a" opacity="0.92" />
            <text x="10" y="15" className="fill-slate-300" style={{ fontSize: 10 }}>{hp.label}</text>
            <text x="10" y="29" className="fill-white" style={{ fontSize: 12, fontWeight: 700 }}>{hp.value}{unit ? ` ${unit}` : ''}</text>
          </g>
        </g>
      )}
    </svg>
  )
}

// ── Sparkline (stat tiles) ───────────────────────────────────────────────────
export function Sparkline({ values, color = '#2a78d6' }: { values: number[]; color?: string }) {
  if (values.length < 2 || values.every(v => v === 0)) return null
  const W = 80, H = 24
  const max = Math.max(1, ...values)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (values.length - 1)) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-6" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
