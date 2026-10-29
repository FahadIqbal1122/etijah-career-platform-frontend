// Web page for one sample report. Renders the blocks extracted from the sample PDF (see src/data/sampleReports).
// Server component: no state, nothing here talks to the API. All names and results in the samples are fictional.

import { Link } from '@/i18n/navigation'
import { demoReportHref, type DemoReportKey } from '@/data/demoReports'

export type SampleBlock =
  | { k: 'title' | 'sub' | 'num' | 'h1' | 'h2' | 'h3' | 'p' | 'callout' | 'tip' | 'eyebrow' | 'chip'; t: string }
  | { k: 'stat'; label: string; value: string }
  | { k: 'chips' | 'ul' | 'ol'; items: string[] }

const COPY = {
  en: { badge: 'Sample report', note: 'This is a sample with fictional data, to show what an Etijahi report looks like.', pdf: 'Download PDF', other: 'العربية', short: 'In short', cta: 'Get your own report', ctaBody: 'Your report is built from your own answers.' },
  ar: { badge: 'نموذج تقرير', note: 'هذا نموذج ببيانات افتراضية، ليريك شكل تقرير إتجاهي.', pdf: 'تحميل PDF', other: 'English', short: 'باختصار', cta: 'احصل على تقريرك', ctaBody: 'يُبنى تقريرك من إجاباتك أنت.' },
}

type Section = { num?: string; title?: string; blocks: SampleBlock[] }

function sectionize(blocks: SampleBlock[]): { hero: SampleBlock[]; sections: Section[] } {
  const hero: SampleBlock[] = []
  const sections: Section[] = []
  let cur: Section | null = null
  let pendingNum: string | undefined
  for (const b of blocks) {
    if (b.k === 'title' || b.k === 'sub') { hero.push(b); continue }
    if (b.k === 'num') { pendingNum = b.t; continue }
    if (b.k === 'h1') { cur = { num: pendingNum, title: b.t, blocks: [] }; pendingNum = undefined; sections.push(cur); continue }
    if (!cur) { cur = { blocks: [] }; sections.push(cur) }
    cur.blocks.push(b)
  }
  return { hero, sections }
}

const pct = (v: string) => /^\d+%$/.test(v.trim())

function Stats({ items }: { items: { label: string; value: string }[] }) {
  if (items.every(i => pct(i.value))) {
    return (
      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {items.map((s, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold text-charcoal">{s.label}</span>
              <span className="font-bold text-primary tabular-nums" dir="ltr">{s.value}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-lightblue overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: s.value.trim() }} />
            </div>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3">
      {items.map((s, i) => (
        <li key={i} className="rounded-xl border border-[var(--line)] bg-lightblue/40 px-3 py-2.5">
          <span className="block text-xs text-charcoal/60">{s.label}</span>
          <span className="block text-sm font-bold text-charcoal">{s.value}</span>
        </li>
      ))}
    </ul>
  )
}

function Blocks({ blocks, l }: { blocks: SampleBlock[]; l: 'en' | 'ar' }) {
  const out: React.ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.k === 'stat') {
      const items: { label: string; value: string }[] = []
      while (i < blocks.length && blocks[i].k === 'stat') { const s = blocks[i] as { label: string; value: string }; items.push({ label: s.label, value: s.value }); i++ }
      i--
      out.push(<Stats key={i} items={items} />)
      continue
    }
    switch (b.k) {
      case 'h2': out.push(<h3 key={i} className="mt-6 pt-6 border-t border-[var(--line)] text-xl font-extrabold text-charcoal">{b.t}</h3>); break
      case 'h3': out.push(<h4 key={i} className="mt-2 text-base font-extrabold text-primary-deep">{b.t}</h4>); break
      case 'eyebrow': out.push(<p key={i} className="mt-2 text-xs font-bold uppercase tracking-wide text-teal">{b.t}</p>); break
      case 'callout': out.push(
        <p key={i} className="rounded-xl bg-lightblue px-4 py-3 text-sm leading-relaxed text-charcoal">
          <span className="font-extrabold text-primary">{COPY[l].short}: </span>{b.t}
        </p>); break
      case 'tip': out.push(<p key={i} className="rounded-xl border-s-4 border-teal bg-teal/10 px-4 py-2.5 text-sm leading-relaxed text-charcoal">{b.t}</p>); break
      case 'chip': out.push(<span key={i} className="chip">{b.t}</span>); break
      case 'chips': out.push(<div key={i} className="flex flex-wrap gap-2">{b.items.map((c, j) => <span key={j} className="chip">{c}</span>)}</div>); break
      case 'ul': out.push(<ul key={i} className="list-disc ps-5 space-y-1.5 text-sm leading-relaxed text-charcoal/85">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>); break
      case 'ol': out.push(
        <ol key={i} className="list-decimal ps-5 space-y-2 text-sm leading-relaxed text-charcoal/85">
          {b.items.map((x, j) => {
            const [head, ...rest] = x.split(' — ')
            return <li key={j}><span className="font-bold text-charcoal">{head}</span>{rest.length > 0 && <span className="block text-charcoal/65">{rest.join(' — ')}</span>}</li>
          })}
        </ol>); break
      default: {
        const t = (b as { t: string }).t
        const muted = t.includes('↗') && t.length < 40
        out.push(<p key={i} className={muted ? 'text-xs font-semibold text-primary/70' : 'text-sm leading-relaxed text-charcoal/85'}>{t}</p>)
      }
    }
  }
  return <div className="space-y-3">{out}</div>
}

export default function SampleReportViewSimple({ blocks, reportKey, locale, title }: {
  blocks: SampleBlock[]
  reportKey: DemoReportKey
  locale: 'en' | 'ar'
  title: string
}) {
  const t = COPY[locale]
  const { hero, sections } = sectionize(blocks)
  const heroTitle = hero.find(b => b.k === 'title') as { t: string } | undefined
  const heroSub = hero.find(b => b.k === 'sub') as { t: string } | undefined
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="card p-6 sm:p-10 bg-lightblue/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="chip">{t.badge} · {title}</span>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href={`/sample/${reportKey}`} locale={locale === 'ar' ? 'en' : 'ar'} className="text-primary hover:underline">{t.other}</Link>
            <a href={demoReportHref(reportKey, locale)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t.pdf} ↗</a>
          </div>
        </div>
        {heroTitle && <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight text-charcoal">{heroTitle.t}</h1>}
        {heroSub && <p className="mt-3 text-base text-charcoal/70">{heroSub.t}</p>}
        <p className="mt-4 text-xs text-charcoal/50">{t.note}</p>
      </header>

      <div className="mt-6 space-y-6">
        {sections.map((s, i) => (
          <section key={i} className="card p-6 sm:p-8">
            {s.num && <p className="font-mono text-xs font-bold tracking-widest text-teal">{s.num}</p>}
            {s.title && <h2 className="mt-1 mb-4 text-2xl font-extrabold text-charcoal">{s.title}</h2>}
            <Blocks blocks={s.blocks} l={locale} />
          </section>
        ))}
      </div>

      <aside className="mt-8 card p-6 sm:p-8 text-center">
        <p className="text-lg font-extrabold text-charcoal">{t.cta}</p>
        <p className="mt-1 text-sm text-charcoal/60">{t.ctaBody}</p>
        <Link href="/assessment" className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-deep">{t.cta}</Link>
      </aside>
    </article>
  )
}
