// Web page for one sample report. Laid out like the paid results page (/results/[id]): same hero, folding section
// bars, cards, score rows, career cards with pills and notes, AI-impact panel. The content comes from the sample PDFs
// (src/data/sampleReports/<key>-<locale>.json, built from public/demo-reports/*.pdf), so the page and the PDF say the same.
// Server component: no state, nothing here talks to the API. All names and results in the samples are fictional.

import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { demoReportHref, type DemoReportKey } from '@/data/demoReports'
import { ProfileHexagon, type ReportTemplateData, type TemplateCareer } from '@/components/report-templates'
import SampleTemplateHero from './SampleTemplateHero'

export type Career = {
  title: string; sector: string; fit: string; fitTone: string; direction: string; dirTone: string
  risk: string; riskText: string; pct: number | null
  summary: string; market: string
  takesLabel: string; takes: string; nowLabel: string; now: string; steps: { step: string; why: string }[]
  aiTitle: string; tasksLabel: string; tasks: string[]; evidence: string[]
  skillsLabel: string; skills: string[]; meansLabel: string; means: string
}
type Row = { label: string; pct?: number; level?: string; detail: string; tip: string }
type Block =
  | { k: 'howto'; title: string; intro: string; items: string[] }
  | { k: 'quick'; items: { label: string; value: string }[] }
  | { k: 'group'; title: string; subtitle: string; callout: string; rows: Row[]; pills: { label: string; value: string }[]; notes: string[] }
  | { k: 'majors'; intro: string[]; items: { title: string; link: string; text: string; leads: string; tryIt: string }[] }
  | { k: 'careers'; intro: string; overall: string; overallLabel: string; items: Career[] }
  | { k: 'courses'; intro: string[]; items: { title: string; meta: string; forWhom: string; about: string; whyLabel: string; why: string }[] }
  | { k: 'p' | 'h3' | 'eyebrow' | 'tip' | 'callout' | 'chip'; t: string; strong?: boolean }
  | { k: 'ul' | 'ol' | 'chips'; items: string[] }
  | { k: 'stat'; label: string; value: string }
type Section = { type: string; num: string | null; title: string; blocks: Block[] }
export type SampleData = { hero: { title?: string; sub?: string }; sections: Section[] }

const COPY = {
  en: { badge: 'Sample report', note: 'This is a sample with fictional data, to show what your Etijahi report looks like.', pdf: 'Download PDF', other: 'العربية', short: 'In short', match: 'match', leads: 'Leads to', tryIt: 'Try it', tip: 'Tip', cta: 'Get your own report', ctaBody: 'Your report is built from your own answers.', expand: 'Expand all', collapse: 'Collapse all' },
  ar: { badge: 'نموذج تقرير', note: 'هذا نموذج ببيانات افتراضية، ليريك شكل تقرير إتجاهي الخاص بك.', pdf: 'تحميل PDF', other: 'English', short: 'باختصار', match: 'تطابق', leads: 'يقود إلى', tryIt: 'جرّبه', tip: 'نصيحة', cta: 'احصل على تقريرك', ctaBody: 'يُبنى تقريرك من إجاباتك أنت.', expand: 'فتح الكل', collapse: 'طي الكل' },
}

// heroicons outline paths, same set the results page uses for its pills
const ICONS = {
  check: 'M4.5 12.75l6 6 9-13.5',
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  sparkles: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
  layers: 'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3',
  shield: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  flag: 'M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5',
  chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
} as const
function Icon({ name, size }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name]} />
    </svg>
  )
}

const TONE: Record<string, string> = { green: 'rp-green', amber: 'rp-amber', rose: 'rp-rose', blue: 'rp-blue', purple: 'rp-purple' }
const RISK_TONE: Record<string, string> = { low: 'rp-green', medium: 'rp-amber', high: 'rp-rose' }

// Brand section header (teal icon tile + title/subtitle), same as the results page's SectionHead.
function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-lightblue flex items-center justify-center shrink-0 text-primary">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={ICONS.chart} /></svg>
      </div>
      <div>
        <h3 className="rp-title text-charcoal">{title}</h3>
        {subtitle && <p className="rp-sub">{subtitle}</p>}
      </div>
    </div>
  )
}

function ScoreRow({ r, l }: { r: Row; l: 'en' | 'ar' }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="rp-sub font-medium">{r.label}</span>
        <span className="rp-pill rp-blue" dir="ltr">{r.pct !== undefined ? `${r.pct}%` : r.level}</span>
      </div>
      {r.pct !== undefined && (
        <div className="w-full bg-lightblue rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${r.pct}%` }} />
        </div>
      )}
      {(r.detail || r.tip) && (
        <div className="mt-2 space-y-1.5">
          {r.detail && <p className="rp-sub text-charcoal/80 leading-snug ps-3 border-s-2 border-teal/70">{r.detail}</p>}
          {r.tip && <p className="text-xs leading-snug rounded-lg bg-teal/10 text-[#0a705a] px-2.5 py-1.5">{r.tip}</p>}
        </div>
      )}
    </div>
  )
}

function CareerPills({ c, dark }: { c: Career; dark: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {c.sector && <span className={`rp-pill ${dark ? 'rp-ondark' : 'rp-gray'}`}>{c.sector}</span>}
      {c.fit && (
        <span className={`rp-pill ${dark ? 'rp-ondark' : TONE[c.fitTone] || 'rp-green'}`}>
          <Icon name={c.fitTone === 'amber' ? 'search' : 'check'} />{c.fit}
        </span>
      )}
      {c.direction && (
        <span className={`rp-pill ${dark ? 'rp-ondark' : TONE[c.dirTone] || 'rp-blue'}`}>
          <Icon name={c.dirTone === 'purple' ? 'sparkles' : 'layers'} />{c.direction}
        </span>
      )}
      {c.riskText && (
        <span className={`rp-pill ${dark ? 'rp-ondark' : RISK_TONE[c.risk] || 'rp-gray'}`}><Icon name="shield" />{c.riskText}</span>
      )}
    </div>
  )
}

function CareerCard({ c, top, l }: { c: Career; top: boolean; l: 'en' | 'ar' }) {
  const t = COPY[l]
  const isNew = c.dirTone === 'purple'
  const hasAi = c.tasks.length > 0 || c.evidence.length > 0 || c.skills.length > 0 || !!c.means
  return (
    <div className={`rounded-2xl px-4 py-4 ${top ? 'bg-primary text-white' : `bg-lightblue/40 border border-[var(--line)] border-s-4 ${isNew ? 'border-s-[var(--rp-purple-line)]' : 'border-s-[var(--rp-blue-line)]'}`}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <p className={`rp-h flex-1 basis-0 min-w-[7rem] ${top ? 'text-white' : 'text-charcoal'}`}>{c.title}</p>
        {c.pct !== null && <span className={`rp-pill shrink-0 ${top ? 'rp-ondark' : 'rp-blue'}`}>{c.pct}% {t.match}</span>}
      </div>
      <CareerPills c={c} dark={top} />
      {c.summary && <p className={`rp-body mt-3 ${top ? 'text-white/95' : 'text-charcoal/90'}`}>{c.summary}</p>}
      {c.market && <p className={`rp-sub mt-2 ${top ? 'text-white/85!' : ''}`}>{c.market}</p>}
      {(c.takes || c.now) && (
        <div className="mt-3 grid grid-cols-1 gap-2.5">
          {c.takes && (
            <div className={`rp-note ${top ? 'rp-ondark-note' : 'rp-amber'}`}>
              <span className="rp-note-label">{c.takesLabel}</span>
              <p className={`rp-sub ${top ? 'text-white/95!' : 'rp-note-text'}`}>{c.takes}</p>
            </div>
          )}
          {c.now && (
            <div className={`rp-note ${top ? 'rp-ondark-note' : 'rp-green'}`}>
              <span className="rp-note-label">{c.nowLabel}</span>
              {c.steps.length > 0 ? (
                <ol className="mt-1 space-y-2">
                  {c.steps.map((s, i) => (
                    <li key={i} className={`rp-sub flex gap-2 ${top ? 'text-white/95!' : 'rp-note-text'}`}>
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <span><span className="font-bold">{s.step}</span>{s.why ? <> — {s.why}</> : null}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className={`rp-sub ${top ? 'text-white/95!' : 'rp-note-text'}`}>{c.now}</p>}
            </div>
          )}
        </div>
      )}
      {hasAi && (
        <details className="group mt-3 rounded-xl bg-white border border-[var(--line)] text-charcoal" open={top}>
          <summary className="list-none cursor-pointer flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 rp-body font-bold min-w-0"><Icon name="shield" size={16} />{c.aiTitle}</span>
            <span className="flex items-center gap-2 ms-auto">
              {c.riskText && <span className={`rp-pill ${RISK_TONE[c.risk] || 'rp-gray'}`}>{c.riskText}</span>}
              <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
            </span>
          </summary>
          <div className="px-3.5 pb-3.5 space-y-3">
            {c.tasks.length > 0 && (
              <div className="rp-note rp-rose">
                <span className="rp-note-label">{c.tasksLabel}</span>
                <ul className="rp-sub rp-note-text list-disc ps-5 space-y-0.5">{c.tasks.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            {c.evidence.map((e, i) => {
              const at = e.indexOf(':')
              return <p key={i} className="rp-sub">{at > 0 && at < 40 ? <><span className="font-bold text-charcoal">{e.slice(0, at + 1)}</span>{e.slice(at + 1)}</> : e}</p>
            })}
            {c.skills.length > 0 && (
              <div>
                <p className="rp-label mb-1.5">{c.skillsLabel}</p>
                <div className="flex flex-wrap gap-2">{c.skills.map((x, i) => <span key={i} className="rp-pill rp-green rp-wrap">{x}</span>)}</div>
              </div>
            )}
            {c.means && (
              <div className="rp-note rp-blue">
                <span className="rp-note-label">{c.meansLabel}</span>
                <p className="rp-body rp-note-text">{c.means}</p>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

// Plan / path / journey and anything else without a dedicated layout: the PDF's text in the report's type scale.
function Generic({ blocks }: { blocks: Block[] }) {
  const out: ReactNode[] = []
  blocks.forEach((b, i) => {
    switch (b.k) {
      case 'h3': out.push(<h4 key={i} className="rp-h text-charcoal pt-2">{b.t}</h4>); break
      case 'eyebrow': out.push(<p key={i} className="rp-label pt-1">{b.t}</p>); break
      case 'tip': out.push(<div key={i} className="rp-note rp-green"><p className="rp-body rp-note-text">{b.t}</p></div>); break
      case 'callout': out.push(<div key={i} className="rp-note rp-blue"><p className="rp-body rp-note-text">{b.t}</p></div>); break
      case 'ul': out.push(<ul key={i} className="rp-body list-disc ps-5 space-y-1 text-charcoal/90">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>); break
      case 'ol': out.push(<ol key={i} className="rp-body list-decimal ps-5 space-y-1 text-charcoal/90">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ol>); break
      case 'p': out.push(<p key={i} className={b.strong ? 'rp-label' : 'rp-body text-charcoal/90'}>{b.t}</p>); break
      case 'stat': out.push(<p key={i} className="rp-sub"><span className="font-bold text-charcoal">{b.label}:</span> {b.value}</p>); break
      default: break
    }
  })
  return <div className="card p-5 space-y-3">{out}</div>
}

function Blocks({ s, l, hex }: { s: Section; l: 'en' | 'ar'; hex?: ReportTemplateData }) {
  const t = COPY[l]
  if (s.type === 'summary') {
    return <>{s.blocks.map((b, i) => {
      if (b.k === 'howto') return (
        <div key={i} className="card p-5">
          <p className="rp-title text-charcoal mb-1">{b.title}</p>
          {b.intro && <p className="rp-sub mb-3">{b.intro}</p>}
          <ul className="space-y-2">
            {b.items.map((it, j) => {
              const [head, ...rest] = it.split(': ')
              return (
                <li key={j} className="rp-body text-charcoal/90">
                  <span className="text-primary me-2 inline-block rtl:-scale-x-100" aria-hidden="true">→</span>
                  <span className="font-bold text-charcoal">{head}:</span> {rest.join(': ')}
                </li>
              )
            })}
          </ul>
        </div>
      )
      if (b.k === 'quick') return (
        <div key={i} className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-3 min-[480px]:gap-4">
          {b.items.map(q => (
            <div key={q.label} className="card p-4 min-[480px]:p-5 text-center min-w-0">
              <p className="eyebrow mb-1.5">{q.label}</p>
              <p className="text-base font-extrabold text-charcoal break-words">{q.value}</p>
            </div>
          ))}
        </div>
      )
      return null
    })}</>
  }
  if (s.type === 'profile') {
    return <>{s.blocks.map((b, i) => b.k !== 'group' ? null : (
      <div key={i} className="card p-5">
        <SectionHead title={b.title} subtitle={b.subtitle} />
        {b.callout && (
          <div className="mb-4 rounded-xl bg-primary/5 border border-primary/15 px-3.5 py-2.5">
            <p className="rp-sub text-charcoal/90 leading-snug"><span className="font-bold text-primary me-1.5">{t.short}</span>{b.callout}</p>
          </div>
        )}
        {hex && i === 0 && <ProfileHexagon data={hex} />}
        {b.rows.length > 0 && <div className="space-y-4">{b.rows.map((r, j) => <ScoreRow key={j} r={r} l={l} />)}</div>}
        {b.pills.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {b.pills.map((p, j) => (
              <div key={j} className="rounded-xl border border-[var(--line)] bg-lightblue/40 px-3 py-2.5">
                <p className="rp-label mb-1">{p.label}</p>
                <p className="rp-body font-bold text-charcoal">{p.value}</p>
              </div>
            ))}
          </div>
        )}
        {b.notes.map((n, j) => <p key={j} className="rp-sub mt-4">{n}</p>)}
      </div>
    ))}</>
  }
  if (s.type === 'majors') {
    const b = s.blocks[0] as Extract<Block, { k: 'majors' }>
    return (
      <div className="card p-5">
        {b.intro.map((p, i) => <p key={i} className={i ? 'rp-sub mb-3' : 'rp-body text-charcoal/85 mb-4'}>{p}</p>)}
        <div className="space-y-3">
          {b.items.map((m, i) => (
            <div key={i} className="rounded-2xl border border-[var(--line)] bg-lightblue/40 px-4 py-3.5">
              <p className="rp-h text-charcoal">{m.title}</p>
              {m.text && <p className="rp-sub mt-0.5">{m.text}</p>}
              {m.leads && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rp-label">{t.leads}</span>
                  {m.leads.split(/[,،]\s*/).map(c => <span key={c} className="rp-pill rp-blue rp-wrap">{c}</span>)}
                </div>
              )}
              {m.link && <span className="rp-pill rp-blue mt-2.5">{m.link}</span>}
              {m.tryIt && (
                <div className="rp-note rp-green mt-2.5">
                  <span className="rp-note-label">{t.tryIt}</span>
                  <p className="rp-sub rp-note-text">{m.tryIt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (s.type === 'careers') {
    const b = s.blocks[0] as Extract<Block, { k: 'careers' }>
    const top = b.items.slice(0, 3)
    return (
      <div className="card p-5">
        <p className="rp-sub mb-4">{b.intro}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {top.map(c => (
            <div key={c.title} className="rounded-2xl border border-[var(--line)] bg-lightblue/40 px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <p className="rp-h flex-1 basis-0 min-w-[7rem] text-charcoal">{c.title}</p>
                {c.pct !== null && <span className="rp-pill rp-blue shrink-0">{c.pct}% {t.match}</span>}
              </div>
              <CareerPills c={c} dark={false} />
              {c.summary && <p className="rp-sub mt-1.5 line-clamp-2">{c.summary}</p>}
            </div>
          ))}
        </div>
        {b.overall && (
          <div className="rp-note rp-blue mb-5">
            {b.overallLabel && <span className="rp-note-label">{b.overallLabel}</span>}
            <p className="rp-body rp-note-text">{b.overall}</p>
          </div>
        )}
        <div className="space-y-3">{b.items.map((c, i) => <CareerCard key={c.title} c={c} top={i === 0} l={l} />)}</div>
      </div>
    )
  }
  if (s.type === 'courses' || s.type === 'certs') {
    const b = s.blocks[0] as Extract<Block, { k: 'courses' }>
    return (
      <div className="card p-5">
        {b.intro.map((p, i) => <p key={i} className="rp-sub mb-4">{p}</p>)}
        <div className="space-y-3">
          {b.items.map((c, i) => (
            <div key={i} className="rounded-2xl border border-[var(--line)] bg-lightblue/40 px-4 py-3.5">
              <p className="rp-h text-charcoal">{c.title}</p>
              {c.meta && <p className="rp-sub" dir="auto">{c.meta}</p>}
              {c.forWhom && <span className="rp-pill rp-green rp-wrap mt-2">{c.forWhom}</span>}
              {c.about && <p className="rp-sub mt-2">{c.about}</p>}
              {c.why && (
                <div className="rp-note rp-green mt-2.5">
                  {c.whyLabel && <span className="rp-note-label">{c.whyLabel}</span>}
                  <p className="rp-sub rp-note-text">{c.why}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (s.type === 'journey') {
    const text = s.blocks.map(b => (b.k === 'p' ? (b as { t: string }).t : '')).filter(Boolean).join(' ')
    return (
      <div className="card p-6 border-s-4 border-s-teal">
        <p className="rp-body text-charcoal/90">{text}</p>
      </div>
    )
  }
  return <Generic blocks={s.blocks} />
}

// ---- Sample data -> the report template's data (the template is the live "Clarity Plus" look) ----
const RIASEC_ORDER = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'] as const
const RIASEC_LABEL = {
  en: { realistic: 'Realistic', investigative: 'Investigative', artistic: 'Artistic', social: 'Social', enterprising: 'Enterprising', conventional: 'Conventional' },
  ar: { realistic: 'واقعي', investigative: 'استقصائي', artistic: 'فني', social: 'اجتماعي', enterprising: 'مبادر', conventional: 'تقليدي' },
}
// the PDF names each type either by its type name (English) or by a persona word (Arabic)
const RIASEC_FROM_PDF: Record<string, (typeof RIASEC_ORDER)[number]> = {
  Realistic: 'realistic', Investigative: 'investigative', Artistic: 'artistic', Social: 'social', Enterprising: 'enterprising', Conventional: 'conventional',
  'الباني': 'realistic', 'المحلل': 'investigative', 'المبدع': 'artistic', 'المُعين': 'social', 'القائد': 'enterprising', 'المنظّم': 'conventional',
}
const LEVEL_WIDTH: Record<string, number> = { High: 80, Medium: 50, Low: 20, 'مرتفع': 80, 'متوسط': 50, 'منخفض': 20 }

function buildTemplateData(data: SampleData, locale: 'en' | 'ar', pdfHref: string): ReportTemplateData {
  const ar = locale === 'ar'
  const groups = data.sections.filter(s => s.type === 'profile').flatMap(s => s.blocks).filter((b): b is Extract<Block, { k: 'group' }> => b.k === 'group')
  const [interests, values, strengths, , personality] = groups
  const byKey: Record<string, number> = {}
  interests?.rows.forEach(r => { const k = RIASEC_FROM_PDF[r.label]; if (k && r.pct !== undefined) byKey[k] = r.pct })
  // ties at the top are common in the samples: the PDF's own "Career type" card decides which one leads
  const quick = data.sections.flatMap(s => s.blocks).find((b): b is Extract<Block, { k: 'quick' }> => b.k === 'quick')
  const lead = quick ? RIASEC_FROM_PDF[quick.items[0]?.value] : undefined
  const ranked = [...RIASEC_ORDER].sort((a, b) => (byKey[b] ?? 0) - (byKey[a] ?? 0) || (b === lead ? 1 : 0) - (a === lead ? 1 : 0))
  const top3 = (g?: { rows: Row[] }) => (g?.rows || []).slice(0, 3).map(r => ({ label: r.label, score: r.pct }))
  const careersBlock = data.sections.flatMap(s => s.blocks).find((b): b is Extract<Block, { k: 'careers' }> => b.k === 'careers')
  const items = careersBlock?.items || []
  const tag = (pick: (c: Career) => boolean, text: (c: Career) => string, fallback: string) => { const c = items.find(pick); return c ? text(c) : fallback }
  const careers: TemplateCareer[] = items.map((c, i) => ({
    title: c.title,
    match: c.pct ?? 0,
    summary: c.summary || undefined,
    risk: c.risk === 'low' || c.risk === 'medium' || c.risk === 'high' ? c.risk : undefined,
    direction: c.dirTone === 'purple' ? 'new_direction' : 'builds_on_background',
    fit: c.fitTone === 'green' ? 'strong_fit' : 'worth_exploring',
    gap: i === 0 && c.takes ? c.takes : undefined,
  }))
  const l = RIASEC_LABEL[locale]
  return {
    locale,
    paid: true,
    riasec: RIASEC_ORDER.map(k => ({ key: k, label: l[k], score: byKey[k] })),
    riasecCode: ranked.slice(0, 3).map(k => k[0].toUpperCase()).join(''),
    topTypeLabel: l[ranked[0]],
    values: top3(values),
    strengths: top3(strengths),
    personality: (personality?.rows || []).slice(0, 5).map(r => ({ label: r.label, score: LEVEL_WIDTH[r.level || ''] ?? 50 })),
    careers,
    lockedMore: 0,
    labels: {
      builds_on_background: tag(c => c.dirTone !== 'purple', c => c.direction, ar ? 'يبني على خلفيتك' : 'Builds on your background'),
      new_direction: tag(c => c.dirTone === 'purple', c => c.direction, ar ? 'اتجاه جديد' : 'A new direction'),
      strong_fit: tag(c => c.fitTone === 'green', c => c.fit, ar ? 'تطابق قوي' : 'Strong fit'),
      worth_exploring: tag(c => c.fitTone !== 'green', c => c.fit, ar ? 'يستحق الاستكشاف' : 'Worth exploring'),
    },
    unlockHref: `/${locale}/assessment`,
    locked: { moreTitle: '', moreBody: '', planTitle: '', planBody: '', planCta: ar ? 'احصل على تقريرك' : 'Get your own report' },
    download: {
      label: ar ? 'تحميل التقرير PDF' : 'Download PDF Report',
      altLabel: ar ? 'تحميل النسخة الإنجليزية' : 'Download Arabic PDF',
      busyLabel: '…',
    },
  }
}

export default function SampleReportView({ data, reportKey, locale, title }: {
  data: SampleData
  reportKey: DemoReportKey
  locale: 'en' | 'ar'
  title: string
}) {
  const t = COPY[locale]
  const { sections } = data
  const other = locale === 'ar' ? 'en' : 'ar'
  const tpl = buildTemplateData(data, locale, demoReportHref(reportKey, locale))
  // Same as the paid page with a template: the template covers the summary, the other sections follow it
  const shown = sections.filter(s => s.type !== 'summary')
  return (
    <div className="min-h-screen brand-surface page-fade-in rt-clarity-map">
      <SampleTemplateHero data={tpl} pdfHref={demoReportHref(reportKey, locale)} altPdfHref={demoReportHref(reportKey, other)} />

      <div className="max-w-[1560px] mx-auto px-6 mt-8 pb-16 space-y-4 relative z-10">
        <div className="card p-5 flex items-center justify-between gap-4 flex-wrap border-s-4 border-s-teal">
          <div>
            <p className="rp-h text-charcoal">{t.badge} · {title}</p>
            <p className="rp-sub mt-0.5">{t.note}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/sample/${reportKey}`} locale={other} className="rp-pill rp-blue" style={{ padding: '9px 16px', fontSize: 14 }}>{t.other}</Link>
            <Link href="/assessment" className="cta shrink-0" style={{ padding: '10px 18px', fontSize: 14, borderRadius: 12 }}>{t.cta}</Link>
          </div>
        </div>

        {shown.map((s, i) => (
          <details key={i} className="group report-section space-y-4" open>
            <summary className="report-section-bar list-none cursor-pointer w-full flex items-center justify-between gap-3 rounded-xl bg-white/70 border border-[var(--line)] px-4 py-2.5 text-start [&::-webkit-details-marker]:hidden">
              <span className="rp-h text-charcoal">{s.title}</span>
              <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="report-section-body space-y-4 mt-4">
              <Blocks s={s} l={locale} hex={tpl} />
            </div>
          </details>
        ))}

        <div className="card p-6 text-center">
          <p className="rp-title text-charcoal">{t.cta}</p>
          <p className="rp-sub mt-1">{t.ctaBody}</p>
          <Link href="/assessment" className="cta mt-4 inline-block" style={{ padding: '10px 22px', fontSize: 14, borderRadius: 12 }}>{t.cta}</Link>
        </div>
      </div>
    </div>
  )
}
