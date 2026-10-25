'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Hexagon } from '@/components/report-templates/visuals'
import type { ReportTemplateData, TemplateScore } from '@/components/report-templates/types'
import { useDisplayCurrency } from '@/lib/useDisplayCurrency'
import { formatPrice } from '@/lib/pricing'

// The free report: a short personal insight with the first purchase button, then the visual profile with a short
// explanation under each part, then the same purchase button again. Both buttons go to the same upgrade link and buy
// the same product (Pathfinder), shown in the visitor's currency.

export interface FreeSnapshotProps {
  locale: 'en' | 'ar'
  interestTypes: string[]          // the person's top interest types, best first ('enterprising', ...)
  firstName?: string | null
  riasec: TemplateScore[]          // the six types in R, I, A, S, E, C order, with scores
  interests: string[]              // labels of the top interests, best first
  values: TemplateScore[]          // top 3
  strengths: TemplateScore[]       // top 3
  personality: { label: string; level: string }[]
  bigFive?: Record<string, string>   // raw levels ('low' | 'medium' | 'high') by trait, for the one-line observation
  notes: { riasec?: string; values?: string; strengths?: string; big_five?: string }
  upgradeHref: string
  onDownload?: () => void          // the free 2-page PDF
  downloading?: boolean
  downloadError?: string
  notesLoading?: boolean           // the "what this means" lines are still being prepared
}

const TYPES = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional']

// One observation drawn from the person's own scores (no AI): the first rule that matches, or none
function tensionKey(types: string[], bf: Record<string, string>): string | null {
  const top2 = types.slice(0, 2)
  if (top2.includes('enterprising') && bf.extraversion === 'low') return 'enterprisingLowExtraversion'
  if (top2.includes('artistic') && bf.conscientiousness === 'high') return 'artisticHighConscientiousness'
  if (top2.includes('social') && bf.agreeableness === 'low') return 'socialLowAgreeableness'
  return null
}

function Scores({ items }: { items: TemplateScore[] }) {
  return (
    <div className="space-y-3">
      {items.map(i => (
        <div key={i.label}>
          <div className="flex items-center justify-between text-sm">
            <span>{i.label}</span>
            {typeof i.score === 'number' && <span className="rp-pill">{Math.round(i.score)}%</span>}
          </div>
          <div className="h-1.5 rounded-full bg-[#e6eef6] mt-1">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, Math.min(100, i.score ?? 0))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Card({ title, sub, note, loading, children }: { title: string; sub: string; note?: string; loading?: boolean; children: ReactNode }) {
  const t = useTranslations('results.freeSnapshot')
  return (
    <div className="card p-5">
      <p className="rp-h text-charcoal">{title}</p>
      <p className="rp-sub mb-3">{sub}</p>
      {children}
      {!note && loading && (
        <div className="mt-3 pt-3 border-t border-dashed border-[var(--line)] space-y-2" aria-hidden="true">
          <div className="h-3 rounded bg-[#e6eef6] animate-pulse w-full" />
          <div className="h-3 rounded bg-[#e6eef6] animate-pulse w-2/3" />
        </div>
      )}
      {note && (
        <p className="rp-sub mt-3 pt-3 border-t border-dashed border-[var(--line)] text-charcoal/90">
          <span className="font-bold text-primary me-1.5">{t('means')}</span>{note}
        </p>
      )}
    </div>
  )
}

// Heading and subtitle stay; the content is replaced by a pay-to-unlock note. Grows to share the column height evenly.
function LockedCard({ title, sub, href }: { title: string; sub: string; href: string }) {
  const t = useTranslations('results.freeSnapshot')
  return (
    <div className="card p-5 flex-1 flex flex-col">
      <p className="rp-h text-charcoal">{title}</p>
      <p className="rp-sub mb-3">{sub}</p>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center rounded-xl border border-dashed border-[var(--line-strong)] bg-[#f2f8fd] px-4 py-5">
        <p className="rp-sub text-charcoal/90">{t('lockedSection')}</p>
        <Link href={href} data-track="results_snapshot_unlock_section" className="text-primary font-bold text-sm underline">{t('lockedSectionCta')}</Link>
      </div>
    </div>
  )
}

function BuyButton({ href, price, lead, track }: { href: string; price: string; lead?: string; track: string }) {
  const t = useTranslations('results.freeSnapshot')
  return (
    <div className="text-center space-y-2">
      {lead && <p className="rp-h text-charcoal">{lead}</p>}
      <Link href={href} data-track={track} className="cta w-full sm:w-auto" style={{ whiteSpace: 'normal' }}>{t('buy', { price })}</Link>
      <p className="rp-sub">{t('buyFine')}</p>
    </div>
  )
}

export default function FreeSnapshot(p: FreeSnapshotProps) {
  const t = useTranslations('results.freeSnapshot')
  const currency = useDisplayCurrency()
  const price = formatPrice('pathfinder', currency, p.locale)
  // "You like {a}—and {b}." from the person's top two interest types, so a tie or a different order still reads right
  const [ta, tb] = [p.interestTypes[0], p.interestTypes[1] ?? p.interestTypes[0]].map(x => (TYPES.includes(x) ? x : 'enterprising'))
  const headline = t('headline', { a: t(`phrase.${ta}`), b: t(`phrase.${tb === ta ? (ta === 'investigative' ? 'enterprising' : 'investigative') : tb}`) })
  const hexData = { riasec: p.riasec } as ReportTemplateData
  const join = (xs: string[]) => xs.filter(Boolean).slice(0, 2).join(t('and'))
  // Broad fields (not careers) for the top two interest types: both of the first type's, one of the second's
  const fieldsOf = (k: string) => (t.raw(`fields.${k}`) as string[]) || []
  const fields = [...fieldsOf(ta), ...(tb !== ta ? fieldsOf(tb).slice(0, 1) : fieldsOf(ta).slice(2))].slice(0, 3)
  const tKey = tensionKey(p.interestTypes, p.bigFive || {})
  const lockedItems = t.raw('lockedItems') as string[]
  const elseItems = t.raw('elseItems') as { title: string; text: string }[]

  return (
    <div className="max-w-5xl mx-auto px-6 pt-10 space-y-6">
      {/* Part 1: one personal insight, then the first purchase chance */}
      <section className="card p-6 sm:p-8 space-y-6">
        <p className="eyebrow">{p.firstName ? t('eyebrowNamed', { name: p.firstName }) : t('eyebrow')}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-charcoal">{headline}</h1>
        <p className="rp-sub">{t('stoodOut')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-4"><p className="eyebrow">{t('interests')}</p><p className="rp-h mt-1">{join(p.interests)}</p></div>
          {/* values and strength are part of the full report: heading only, content hidden
          <div className="card p-4"><p className="eyebrow">{t('values')}</p><p className="rp-h mt-1">{join(p.values.map(v => v.label))}</p></div>
          <div className="card p-4"><p className="eyebrow">{t('strength')}</p><p className="rp-h mt-1">{p.strengths[0]?.label}</p><p className="rp-sub">{t('selfReported')}</p></div>
          */}
          <div className="card p-4"><p className="eyebrow">{t('values')}</p><p className="rp-sub mt-1">{t('lockedShort')}</p></div>
          <div className="card p-4"><p className="eyebrow">{t('strength')}</p><p className="rp-sub mt-1">{t('lockedShort')}</p></div>
        </div>
        <div className="rounded-2xl bg-[#f2f8fd] p-5 sm:p-6 space-y-3">
          <p className="eyebrow">{t('questionEyebrow')}</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal">{t('question')}</h2>
          <p className="rp-sub text-charcoal/90">{t('questionBody')}</p>
          <div className="pt-3 border-t border-dashed border-[var(--line)] space-y-3">
            <p className="text-sm text-charcoal">{t('foundMatches')}</p>
            {/* <div className="flex flex-wrap gap-2">
              {fields.map(f => <span key={f} className="rp-pill rp-blue">{f}</span>)}
            </div> */}
            <div className="rounded-xl border border-dashed border-[var(--line-strong)] bg-white px-4 py-2">
              <p className="eyebrow">{t('lockedTitle')}</p>
              <ul>
                {lockedItems.map(x => (
                  <li key={x} className="flex items-center justify-between gap-3 py-1.5 border-t first:border-t-0 border-[var(--line)] text-sm font-bold text-charcoal">
                    <span>{x}</span>
                    <span className="rp-pill shrink-0 text-xs font-normal">{t('locked')}</span>
                  </li>
                ))}
              </ul>
            </div>
            {tKey && (
              <p className="text-sm border-s-4 border-[#c8962e] bg-[#fdf8ec] rounded-e-lg px-3 py-2">
                <b>{t('tensionTitle')}</b> {t(`tension.${tKey}`)}
              </p>
            )}
          </div>
          <BuyButton href={p.upgradeHref} price={price} track="results_snapshot_unlock_top" />
        </div>
        <div className="text-center">
          <button type="button" className="text-primary font-bold text-sm"
            onClick={() => document.getElementById('free-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {t('continue')} ↓
          </button>
        </div>
      </section>

      {/* Part 2: the visual profile, each part explained, then the same purchase again */}
      <section id="free-profile" className="space-y-4 scroll-mt-6">
        <div>
          <p className="eyebrow">{t('profileEyebrow')}</p>
          <h2 className="text-2xl font-extrabold text-charcoal">{t('profileTitle')}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 items-stretch">
          <Card title={t('cardInterests')} sub={t('cardInterestsSub')} note={p.notes.riasec} loading={p.notesLoading}>
            <Hexagon data={hexData} />
            <div className="mt-3"><Scores items={p.riasec.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))} /></div>
          </Card>
          {/* previous version showed the values, strengths and personality content:
          <div className="space-y-4">
            <Card title={t('cardValues')} sub={t('cardValuesSub')} note={p.notes.values} loading={p.notesLoading}><Scores items={p.values} /></Card>
            <Card title={t('cardStrengths')} sub={t('cardStrengthsSub')} note={p.notes.strengths} loading={p.notesLoading}><Scores items={p.strengths} /></Card>
            <Card title={t('cardPersonality')} sub={t('cardPersonalitySub')} note={p.notes.big_five} loading={p.notesLoading}>
              <div className="flex flex-wrap gap-2">
                {p.personality.map(x => <span key={x.label} className="rp-pill">{x.label}: <b>{x.level}</b></span>)}
              </div>
            </Card>
          </div>
          */}
          {/* Right column: the same height as the interests card, split evenly between the three locked sections */}
          <div className="flex flex-col gap-4">
            <LockedCard title={t('cardValues')} sub={t('cardValuesSub')} href={p.upgradeHref} />
            <LockedCard title={t('cardStrengths')} sub={t('cardStrengthsSub')} href={p.upgradeHref} />
            <LockedCard title={t('cardPersonality')} sub={t('cardPersonalitySub')} href={p.upgradeHref} />
          </div>
        </div>
        <div className="card p-6 space-y-3">
          <BuyButton href={p.upgradeHref} price={price} lead={t('buyLead')} track="results_snapshot_unlock_bottom" />
          <p className="rp-h text-center text-charcoal">{t('elseTitle')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {elseItems.map((x, i) => (
              <div key={x.title} className={`rounded-lg border border-[var(--line)] bg-white px-3 py-2${i === elseItems.length - 1 ? ' sm:col-span-2 bg-[#f2f8fd]' : ''}`}>
                <p className="text-sm font-bold text-primary">{x.title}</p>
                <p className="rp-sub">{x.text}</p>
              </div>
            ))}
          </div>
          {/* <p className="rp-sub text-center">{t('includes')}</p>   previous one-line version */}
        </div>
        {p.onDownload && (
          <div className="text-center space-y-1">
            <button type="button" data-track="results_snapshot_download" onClick={p.onDownload} disabled={p.downloading} className="text-primary font-bold text-sm underline disabled:opacity-50">
              {p.downloading ? t('downloading') : t('download')}
            </button>
            {p.downloadError && <p className="text-xs text-rose-600">{p.downloadError}</p>}
          </div>
        )}
        <p className="rp-sub text-center">{t('disclaimer')}</p>
      </section>
    </div>
  )
}
