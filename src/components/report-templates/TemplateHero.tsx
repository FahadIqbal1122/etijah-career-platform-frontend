'use client'

import type { CSSProperties } from 'react'
import type { ReportTemplateData } from './types'
import { A, Lock, Logo, MONO, clampScore } from './parts'
import { Constellation } from './visuals'

// The hero of the non-default templates. It carries only what the default hero carries (type, code, the download
// action) plus the best career and top value/strength the report already shows on the free plan.

export type HeroVariant = 'clarity' | 'constellation'

export default function TemplateHero({ data, variant }: { data: ReportTemplateData; variant: HeroVariant }) {
  const ar = data.locale === 'ar'
  const s = data.strings
  const dl = data.download
  const dark = variant === 'constellation'
  const top = data.careers[0]
  const ls = (v: string) => (ar ? '0' : v)
  const mono = ar ? undefined : MONO

  const btnBase: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, padding: '0 18px', borderRadius: 12, minHeight: 44, border: 0, cursor: 'pointer', font: 'inherit' }
  const primary: CSSProperties = dark ? { ...btnBase, background: '#00c9a7', color: '#04323f' } : { ...btnBase, background: '#0770ba', color: '#fff' }
  const secondary: CSSProperties = dark
    ? { ...btnBase, background: 'transparent', color: '#fff', border: '1px solid rgba(156,199,232,0.4)' }
    : { ...btnBase, background: '#fff', color: '#075288', border: '1px solid rgba(7,112,186,0.24)' }

  const actions = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      {dl.locked ? (
        <A href={dl.href} preview={data.preview} style={secondary}><Lock size={16} />{dl.lockedLabel}</A>
      ) : (
        <>
          <button type="button" onClick={dl.onDownload} disabled={dl.busy} style={{ ...primary, opacity: dl.busy ? 0.6 : 1 }}>{dl.busy ? dl.busyLabel : dl.label}</button>
          {dl.altLabel && <button type="button" onClick={dl.onAlt} disabled={dl.busy} style={{ ...secondary, opacity: dl.busy ? 0.6 : 1 }}>{dl.busy ? dl.busyLabel : dl.altLabel}</button>}
        </>
      )}
      {dl.error && <span style={{ color: dark ? '#fda4af' : '#be123c', fontSize: 13 }}>{dl.error}</span>}
    </div>
  )

  const chips = [s.typeLine, s.codeLine, s.topValue && `${s.topValue.label}: ${s.topValue.value}`, s.topStrength && `${s.topStrength.label}: ${s.topStrength.value}`].filter(Boolean) as string[]

  if (!dark) {
    return (
      <section dir={ar ? 'rtl' : 'ltr'} style={{ containerType: 'inline-size', background: '#f4f9ff', borderBottom: '1px solid rgba(7,112,186,0.12)', color: '#414142' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 48px', display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center' }}>
          <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 13, letterSpacing: ls('0.14em'), color: '#0b5c99', fontWeight: 500 }}>
              <Logo size={26} /><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c9a7' }} />{s.eyebrow}
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px, 6cqw, 52px)', lineHeight: 1.1, fontWeight: 800, color: '#1f2a37' }}>{s.title}</h1>
            <p style={{ margin: 0, fontSize: 'clamp(15px, 2.2cqw, 18px)', lineHeight: 1.6, color: '#4d5056', maxWidth: 520 }}>{s.subtitle}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {chips.map(c => <span key={c} style={{ background: '#fff', border: '1px solid rgba(7,112,186,0.18)', borderRadius: 999, padding: '8px 14px', fontSize: 14, fontWeight: 700, color: '#075288' }}>{c}</span>)}
            </div>
            {actions}
          </div>
          {top && (
            <div style={{ flex: '1 1 300px', minWidth: 0, maxWidth: 420, background: '#fff', border: '1px solid rgba(7,112,186,0.16)', borderRadius: 22, boxShadow: '0 24px 60px rgba(7,82,136,0.14)', padding: 24, display: 'flex', gap: 18, alignItems: 'center' }}>
              <Ring value={clampScore(top.match)} label={s.match} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: ls('0.14em'), color: '#0a705a', fontWeight: 600 }}>{s.topMatch}</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#1f2a37', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{top.title}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {top.direction && <Pill bg="#e2f6f0" fg="#0a705a">{s.directionName[top.direction]}</Pill>}
                  {top.risk && <Pill bg={top.risk === 'low' ? '#e2f6f0' : top.risk === 'high' ? '#fde4e1' : '#fff1d1'} fg={top.risk === 'low' ? '#0a705a' : top.risk === 'high' ? '#a1261a' : '#8a5300'}>{s.aiRisk}: {s.riskName[top.risk]}</Pill>}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section dir={ar ? 'rtl' : 'ltr'} style={{ containerType: 'inline-size', background: '#052640', backgroundImage: 'radial-gradient(circle at 78% 30%, rgba(7,112,186,0.55), rgba(5,38,64,0) 55%)', color: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 48px', display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center' }}>
        <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 13, letterSpacing: ls('0.16em'), color: '#00c9a7', fontWeight: 500 }}><Logo size={26} />{s.eyebrow}</div>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px, 6cqw, 52px)', lineHeight: 1.1, fontWeight: 800 }}>{s.title}</h1>
          <p style={{ margin: 0, fontSize: 'clamp(15px, 2.2cqw, 18px)', lineHeight: 1.6, color: '#c9dcef', maxWidth: 520 }}>{s.subtitle}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1, background: 'rgba(156,199,232,0.2)', border: '1px solid rgba(156,199,232,0.2)', borderRadius: 18, overflow: 'hidden', maxWidth: 520 }}>
            {[[s.typeLine, ''], ...(top ? [[`${clampScore(top.match)}%`, s.topMatch]] : []), [String(data.careers.length), s.careers]].map(([v, k], i) => (
              <div key={i} style={{ background: '#072d4b', padding: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: i === 0 ? 16 : 28, fontWeight: 800, lineHeight: i === 0 ? 1.3 : 1, color: top && i === 1 ? '#00c9a7' : undefined }}>{v}</span>
                {k && <span style={{ fontSize: 13, color: '#b9cfe3' }}>{k}</span>}
              </div>
            ))}
          </div>
          {chips.length > 1 && <p style={{ margin: 0, fontFamily: mono, fontSize: 12, letterSpacing: ls('0.08em'), color: '#9cc7e8' }}>{chips.slice(1).join('  ·  ')}</p>}
          {actions}
        </div>
        {data.careers.length > 0 && (
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            <Constellation data={data} unlockedLabel={s.mapUnlocked} lowestLabel={s.mapLowestRisk} />
          </div>
        )}
      </div>
    </section>
  )
}

function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 13, fontWeight: 700, color: fg, background: bg, borderRadius: 999, padding: '4px 10px' }}>{children}</span>
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 52, circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 104, height: 104, flex: '0 0 104px' }}>
      <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e6eef7" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#00c9a7" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(circ * value) / 100} ${circ}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#1f2a37', lineHeight: 1 }}>{value}%</span>
        <span style={{ fontSize: 12, color: '#5c6068' }}>{label}</span>
      </div>
    </div>
  )
}
