'use client'

// Parent campaign page (/[locale]/parents-v2): the 8-section page from the "Etijahi Parent Campaign" doc, copy in
// src/data/parentsPage.ts. Not yet the live /parents page: the parent-pays-first flow (pay, receive the child's link) does not
// exist yet, so the pay buttons stay switched off until it does. Flip PAY_FLOW_READY and wire onPay when it is built.
//
// Design idea: the brand's constellation, used for what this page is about. The parent and the child are two stars, and the
// personal link a parent receives after paying is the thread between them. It draws itself once in the hero (the one moving
// part of the page); everything else is deliberately still. Sections are shaped by their content, not repeated as cards:
// a typographic statement (the problem), a path (what the assessment explores and shows), a thread of three stations
// (your part, their part, together), the report as a sheet, and a pricing band.

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { Wordmark } from '@/components/brand/Logomark'
import HeroField from '@/components/landing/HeroField'
import DemoReportsButton from '@/components/shared/DemoReportsButton'
import EmailLink from '@/components/shared/EmailLink'
import { L } from '@/data/landing'
import { PARENTS, type Bi } from '@/data/parentsPage'
import ParentBuyForm from '@/components/landing/ParentBuyForm'
import type { PlanCode } from '@/lib/api'
import { formatPrice } from '@/lib/pricing'
import { useDisplayCurrency } from '@/lib/useDisplayCurrency'
import { setLandingVariant, track, trackOnce } from '@/lib/analytics'

type FooterCopy = { brandTagline: string; brandPowered: string; contactHead: string; phone: string; legal: { label: string; href: string }[]; copyright: string }

const PAY_FLOW_READY = process.env.NEXT_PUBLIC_PARENT_PAY === '1'   // true once a parent can pay first and receive the child's personal link
// Tester switch: opening the page with ?pay=1 turns the buy buttons on in that browser only (remembered for the session), so the
// flow can be tried on the live preview before the setting above is turned on for everyone.
const TESTER_KEY = 'parents:pay-test'

const CSS = `
.pp-thread { stroke-dasharray: 1; stroke-dashoffset: 1; animation: pp-draw 1.9s .5s cubic-bezier(.5,.1,.2,1) forwards; }
.pp-node-late { opacity: 0; animation: pp-fade .6s 2.2s ease forwards; }
.pp-node { opacity: 0; animation: pp-fade .5s .2s ease forwards; }
.pp-node-child { opacity: 0; animation: pp-fade .5s 2.1s ease forwards; }
.pp-pulse { transform-box: fill-box; transform-origin: center; animation: pp-pulse 3.2s 2.8s ease-in-out infinite; }
@keyframes pp-draw { to { stroke-dashoffset: 0; } }
@keyframes pp-fade { to { opacity: 1; } }
@keyframes pp-pulse { 0%,100% { transform: scale(1); opacity: .55; } 50% { transform: scale(1.9); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .pp-thread { animation: none; stroke-dashoffset: 0; }
  .pp-node, .pp-node-late, .pp-node-child { animation: none; opacity: 1; }
  .pp-pulse { animation: none; opacity: 0; }
}
.pp-hero { background: radial-gradient(120% 100% at 85% 0%, #0a82d6 0%, var(--primary) 38%, var(--primary-deep) 100%); color: #fff; }
.pp-veil { background: linear-gradient(to right, rgba(5,58,96,.7), rgba(5,58,96,.35) 55%, transparent); }
[dir="rtl"] .pp-veil { background: linear-gradient(to left, rgba(5,58,96,.7), rgba(5,58,96,.35) 55%, transparent); }
@media (max-width: 1023px) { .pp-veil, [dir="rtl"] .pp-veil { background: rgba(5,58,96,.5); } .pp-hero .hero-field { opacity: .4; } }
.pp-band { background: radial-gradient(110% 90% at 50% -10%, #0a82d6 0%, var(--primary-deep) 55%, #053a60 100%); color: #fff; }
`

function Faq({ items, lang }: { items: { q: Bi; a: Bi }[]; lang: 'en' | 'ar' }) {
  const [open, setOpen] = useState(-1)
  return (
    <>
      {items.map((it, i) => (
        <div key={it.q.en} className={`faq-item border-b border-[var(--line)] ${open === i ? 'open' : ''}`}>
          <button
            className="w-full flex items-center gap-4 text-start py-5 font-extrabold text-charcoal hover:text-primary transition-colors"
            onClick={() => { setOpen(open === i ? -1 : i); if (open !== i) track('parents_faq_open', { question: it.q.en }) }}
            aria-expanded={open === i}
          >
            <span className="flex-1">{it.q[lang]}</span>
            <span className="faq-chev flex-none w-7 h-7 rounded-full bg-teal/12 text-teal flex items-center justify-center" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
          <div className="faq-a-wrap"><div className="faq-a-inner"><p className="pb-5 text-sm text-charcoal/80 leading-relaxed">{it.a[lang]}</p></div></div>
        </div>
      ))}
    </>
  )
}

/** The hero picture: two stars (you, your child) and the thread between them. The thread draws once, then the child's star
 *  lights up and "together" pulses on the thread. Positions are mirrored for right to left so the parent is on the reading side. */
function LinkPicture({ lang, parent, child, together }: { lang: 'en' | 'ar'; parent: string; child: string; together: string }) {
  const rtl = lang === 'ar'
  const mx = (x: number) => (rtl ? 420 - x : x)
  const A = { x: mx(64), y: 232 }, B = { x: mx(352), y: 70 }, M = { x: mx(206), y: 150 }
  const path = `M ${A.x} ${A.y} C ${mx(150)} ${262}, ${mx(190)} ${60}, ${B.x} ${B.y}`
  const label = (x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end') => (
    <text x={x} y={y} textAnchor={anchor} fill="#fff" fontSize="16" fontWeight="700" style={{ fontFamily: 'inherit' }}>{text}</text>
  )
  return (
    <svg viewBox="0 0 420 300" className="w-full h-auto max-w-[520px] mx-auto" role="img" aria-label={`${parent}, ${together}, ${child}`}>
      <defs>
        <radialGradient id="pp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00C9A7" stopOpacity=".55" /><stop offset="100%" stopColor="#00C9A7" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* faint context stars from the brand asterism */}
      {[[40, 40], [120, 100], [300, 220], [380, 270], [260, 30], [20, 160], [400, 150]].map(([x, y], i) => (
        <circle key={i} cx={mx(x)} cy={y} r={i % 2 ? 1.6 : 1.1} fill="#fff" opacity=".35" />
      ))}
      <path d={path} pathLength={1} className="pp-thread" fill="none" stroke="#00C9A7" strokeWidth="4" strokeLinecap="round" />
      {/* you */}
      <g className="pp-node">
        <circle cx={A.x} cy={A.y} r="30" fill="url(#pp-glow)" />
        <circle cx={A.x} cy={A.y} r="9" fill="#fff" />
        {label(A.x, A.y + 34, parent, 'middle')}
      </g>
      {/* together, on the thread */}
      <g className="pp-node-late">
        <circle className="pp-pulse" cx={M.x} cy={M.y} r="8" fill="#00C9A7" />
        <circle cx={M.x} cy={M.y} r="6" fill="#00C9A7" />
        {label(M.x, M.y + 28, together, 'middle')}
      </g>
      {/* your child */}
      <g className="pp-node-child">
        <circle cx={B.x} cy={B.y} r="34" fill="url(#pp-glow)" />
        <circle cx={B.x} cy={B.y} r="11" fill="#fff" />
        <circle cx={B.x} cy={B.y} r="4.5" fill="#00C9A7" />
        {label(B.x, B.y - 22, child, 'middle')}
      </g>
    </svg>
  )
}

export default function ParentsPage() {
  const locale = useLocale()
  const lang: 'en' | 'ar' = locale === 'ar' ? 'ar' : 'en'
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const arrow = dir === 'rtl' ? '←' : '→'
  const router = useRouter()
  const pathname = usePathname()
  const currency = useDisplayCurrency()   // SAR unless the admin currency switch is on and the visitor is elsewhere in the Gulf
  const price = formatPrice('pathfinder', currency, locale)
  const priceWas = formatPrice('pathfinder_standard', currency, locale)
  const coachPrice = formatPrice('launchpad', currency, locale)
  const coachWas = formatPrice('launchpad_standard', currency, locale)
  const footer = ((L as unknown as Record<string, { footer: FooterCopy }>)[lang] ?? (L as unknown as Record<string, { footer: FooterCopy }>).en).footer
  const t = PARENTS
  const nums = lang === 'ar' ? ['١', '٢', '٣'] : ['1', '2', '3']

  // Which of the three button wordings this visitor sees: ?cta=1|2|3 forces one (for checking), otherwise one is picked at random
  // and remembered so the same person always sees the same wording. It is sent with every event, so results can be compared.
  const [ctaV, setCtaV] = useState<number | null>(null)   // null until the pick below has run, so no event goes out with the wrong wording
  useEffect(() => {
    let v = -1
    try {
      const q = Number(new URLSearchParams(window.location.search).get('cta'))
      if (q >= 1 && q <= t.ctaVariants.length) v = q - 1
      else {
        const saved = Number(window.localStorage.getItem('parents:cta'))
        if (Number.isInteger(saved) && saved >= 0 && saved < t.ctaVariants.length && window.localStorage.getItem('parents:cta') !== null) v = saved
      }
      if (v < 0) v = Math.floor(Math.random() * t.ctaVariants.length)
      window.localStorage.setItem('parents:cta', String(v))
    } catch { if (v < 0) v = 0 }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only store
    setCtaV(v)
  }, [t.ctaVariants.length])
  const ctaLabel = t.ctaVariants[ctaV ?? 0][lang]
  const variantNo = (ctaV ?? 0) + 1

  useEffect(() => {
    setLandingVariant('parents')
    if (ctaV !== null) trackOnce('parents_page_view', 'parents_page_view', { lang, cta_variant: variantNo })
  }, [lang, ctaV])

  // On phones a button stays at the bottom once the hero is gone, until the pricing section is on screen.
  const heroRef = useRef<HTMLElement | null>(null)
  const priceRef = useRef<HTMLElement | null>(null)
  const [buying, setBuying] = useState<PlanCode | null>(null)
  const [testerPay, setTesterPay] = useState(false)
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('pay') === '1') window.sessionStorage.setItem(TESTER_KEY, '1')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only store
      if (window.sessionStorage.getItem(TESTER_KEY) === '1') setTesterPay(true)
    } catch { /* no storage: the setting above decides */ }
  }, [])
  const payOn = PAY_FLOW_READY || testerPay
  const [heroGone, setHeroGone] = useState(false)
  const [priceSeen, setPriceSeen] = useState(false)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const a = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting), { threshold: 0 })
    const b = new IntersectionObserver(([e]) => setPriceSeen(e.isIntersecting), { threshold: 0.15 })
    if (heroRef.current) a.observe(heroRef.current)
    if (priceRef.current) b.observe(priceRef.current)
    return () => { a.disconnect(); b.disconnect() }
  }, [])

  const cta = (where: string) => track('parents_cta_click', { where, lang, cta_variant: variantNo })
  const bigH = { fontSize: 'clamp(2.1rem, 5.4vw, 4.2rem)', lineHeight: lang === 'ar' ? 1.4 : 1.08, letterSpacing: lang === 'ar' ? 0 : '-0.03em', textWrap: 'balance' } as React.CSSProperties
  const midH = { fontSize: 'clamp(1.7rem, 3.6vw, 2.8rem)', lineHeight: lang === 'ar' ? 1.4 : 1.12, letterSpacing: lang === 'ar' ? 0 : '-0.02em', textWrap: 'balance' } as React.CSSProperties

  return (
    <div dir={dir} lang={lang} className="min-h-screen bg-white">
      <style>{CSS}</style>

      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[var(--line)]">
        <div className="site-wrap h-16 flex items-center justify-between gap-4">
          <Wordmark size={30} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.replace(pathname, { locale: lang === 'en' ? 'ar' : 'en' })}
              className="text-xs font-medium text-charcoal/60 hover:text-primary border border-[var(--line-strong)] rounded-full px-3 py-2"
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
            <a href="#pricing" onClick={() => cta('nav')} className="cta cta-teal" style={{ padding: '9px 16px', fontSize: 14, borderRadius: 999 }}>{t.nav.cta[lang]}</a>
          </div>
        </div>
      </nav>

      {/* ── 1 + 2  Hero: headline, supporting line, button, and the thread between two stars ── */}
      <header ref={heroRef} className="pp-hero relative overflow-hidden">
        <HeroField tone="onteal" fadeMode="left" />
        <div className="pp-veil absolute inset-y-0 start-0 w-full lg:w-[66%] pointer-events-none" aria-hidden="true" />
        <div className="site-wrap relative z-10 py-14 sm:py-20 lg:py-24 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div>
            <h1 className="font-extrabold" style={bigH}>{t.hero.headline[lang]}</h1>
            <p className="mt-6 text-lg sm:text-xl text-white/85 leading-relaxed max-w-[56ch]">{t.hero.sub[lang]}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#pricing" onClick={() => cta('hero')} className="cta cta-teal"><span>{ctaLabel}</span><span className="cta-arrow">{arrow}</span></a>
              <DemoReportsButton locale={locale} source="parents_hero" track="parents_hero_sample_report" className="text-white/90 underline underline-offset-4 hover:text-white py-3">{t.closing.sample[lang]}</DemoReportsButton>
            </div>
            <p className="mt-4 text-sm text-white/75">{t.hero.note[lang]}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              {t.hero.facts.map(f => (
                <li key={f.en} className="flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-teal" aria-hidden="true" />{f[lang]}</li>
              ))}
            </ul>
          </div>
          <LinkPicture lang={lang} parent={t.how.cols[0].head[lang]} child={t.how.cols[1].head[lang]} together={t.how.cols[2].head[lang]} />
        </div>
      </header>

      {/* ── 3  The problem: one statement, set large ── */}
      <section className="bg-white">
        <div className="site-wrap py-16 sm:py-24 grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-16 items-start">
          <h2 className="font-extrabold text-charcoal" style={bigH}>{t.problem.title[lang]}</h2>
          <div className="space-y-5 text-charcoal/80 leading-relaxed text-lg lg:pt-3">
            <p>{t.problem.p1[lang]}</p>
            <p className="border-s-4 border-teal ps-5 text-charcoal">{t.problem.p2[lang]}</p>
          </div>
        </div>
      </section>

      {/* ── 4  The solution: what the assessment looks at, and what it gives back ── */}
      <section className="bg-lightblue">
        <div className="site-wrap py-16 sm:py-24">
          <h2 className="font-extrabold text-charcoal max-w-[22ch]" style={midH}>{t.solution.title[lang]}</h2>
          <p className="mt-6 text-charcoal/80 leading-relaxed text-lg max-w-[62ch]">{t.solution.p1[lang]}</p>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <ul className="grid grid-cols-2 gap-3">
              {t.solution.explores.map(x => (
                <li key={x.en} className="bg-white border border-[var(--line)] rounded-2xl px-4 py-4 font-bold text-charcoal leading-snug">{x[lang]}</li>
              ))}
            </ul>
            <div className="flex lg:flex-col items-center justify-center text-primary text-3xl font-light py-1" aria-hidden="true">
              <span className="lg:hidden">↓</span><span className="hidden lg:inline">{arrow}</span>
            </div>
            <ul className="grid gap-3">
              {t.solution.shows.map((x, i) => (
                <li key={x.en} className={`rounded-2xl px-5 py-4 font-bold leading-snug ${i === 0 ? 'bg-primary text-white' : 'bg-white border border-[var(--line)] text-charcoal'}`}>{x[lang]}</li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-sm text-charcoal/70 max-w-[62ch]">{t.solution.p2[lang]}</p>
        </div>
      </section>

      {/* ── 5  How it works: three stations on one thread (a real sequence, so numbered) ── */}
      <section className="bg-white">
        <div className="site-wrap py-16 sm:py-24">
          <h2 className="font-extrabold text-charcoal max-w-[24ch]" style={midH}>{t.how.title[lang]}</h2>
          <div className="relative mt-12">
            <span className="absolute start-[19px] top-2 bottom-2 w-px bg-teal/50 md:hidden" aria-hidden="true" />
            <span className="absolute hidden md:block top-[19px] start-5 end-5 h-px bg-teal/50" aria-hidden="true" />
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {t.how.cols.map((c, i) => (
                <div key={c.head.en} className="relative ps-14 md:ps-0 md:pt-16">
                  <span className="absolute start-0 top-0 w-10 h-10 rounded-full bg-primary text-white font-extrabold flex items-center justify-center ring-4 ring-white">{nums[i]}</span>
                  <h3 className="text-xl font-extrabold text-charcoal">{c.head[lang]}</h3>
                  <ul className="mt-3 space-y-3 text-charcoal/80 leading-relaxed">
                    {c.items.map(it => <li key={it.en}>{it[lang]}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-12 max-w-[62ch] rounded-2xl bg-lightblue px-6 py-5 text-charcoal/85 leading-relaxed">{t.how.why[lang]}</p>
        </div>
      </section>

      {/* ── 6  What you'll read together: the report, shown as a sheet ── */}
      <section className="bg-lightblue">
        <div className="site-wrap py-16 sm:py-24 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16 items-start">
          <div>
            <h2 className="font-extrabold text-charcoal" style={midH}>{t.read.title[lang]}</h2>
            <p className="mt-5 text-charcoal/75 leading-relaxed text-lg max-w-[44ch]">{t.read.coach[lang]}</p>
            <div className="mt-6">
              <DemoReportsButton locale={locale} source="parents_page" track="parents_sample_report" className="cta cta-outline cta-sm">{t.closing.sample[lang]}</DemoReportsButton>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-[var(--line)] shadow-[0_30px_70px_-40px_rgba(7,82,136,0.55)] overflow-hidden">
            <div className="bg-primary text-white px-6 py-5">
              <p className="text-sm text-white/80">{t.pricing.packageName[lang]}</p>
              <p className="text-xl font-extrabold">{t.pricing.title[lang]}</p>
            </div>
            <ul className="px-6 py-2">
              {t.read.items.map(it => (
                <li key={it.en} className="flex gap-3 py-3.5 border-b border-[var(--line)] last:border-b-0 text-charcoal/85 leading-relaxed">
                  <span className="mt-1 flex-none w-5 h-5 rounded-full bg-teal/15 text-teal flex items-center justify-center text-xs" aria-hidden="true">✓</span>
                  <span>{it[lang]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 6b  Pricing ── */}
      <section id="pricing" ref={priceRef} className="pp-band scroll-mt-16">
        <div className="site-wrap py-16 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-stretch max-w-5xl mx-auto">
            <div className="bg-white text-charcoal rounded-3xl p-8 sm:p-10 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] flex flex-col">
              <p className="text-sm font-bold text-primary">{t.pricing.packageName[lang]}</p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold">{t.pricing.title[lang]}</h2>
              <p className="mt-6 flex items-baseline gap-3" dir="ltr" style={{ justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start' }}>
                <span className="text-2xl text-charcoal/45 line-through">{priceWas}</span>
                <span className="text-5xl sm:text-6xl font-extrabold text-primary-deep">{price}</span>
              </p>
              <p className="mt-2 text-sm text-charcoal/70">{t.pricing.underPrice[lang]}</p>
              <p className="mt-5 text-charcoal/85">{t.pricing.included[lang]}</p>
              <div className="mt-auto pt-8">
                <button
                  type="button" disabled={!payOn} aria-disabled={!payOn}
                  onClick={() => { track('parents_pay_click', { plan: 'pathfinder', lang, cta_variant: variantNo }); setBuying('pathfinder') }}
                  className="cta cta-teal w-full"
                >{payOn ? t.pricing.button[lang] : t.pricing.soon[lang]}</button>
                <p className="mt-3 text-sm text-charcoal/65">{t.pricing.underButton[lang]}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/30 p-8 flex flex-col">
              <h3 className="text-xl font-extrabold">{t.pricing.addOnName[lang]}</h3>
              <p className="mt-3 text-white/85 leading-relaxed">{t.pricing.addOn[lang]}</p>
              <p className="mt-6 flex items-baseline gap-3" dir="ltr" style={{ justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start' }}>
                <span className="text-lg text-white/55 line-through">{coachWas}</span>
                <span className="text-4xl font-extrabold">{coachPrice}</span>
              </p>
              <div className="mt-auto pt-8">
                <button
                  type="button" disabled={!payOn} aria-disabled={!payOn}
                  onClick={() => { track('parents_pay_click', { plan: 'launchpad', lang, cta_variant: variantNo }); setBuying('launchpad_monthly') }}
                  className="cta cta-onteal w-full"
                >{payOn ? t.pricing.addOnButton[lang] : t.pricing.soon[lang]}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7  Closing call to action ── */}
      <section className="sec-teal relative overflow-hidden text-center py-16 sm:py-24">
        <HeroField tone="onteal" fadeMode="center" />
        <div className="relative z-10 max-w-2xl mx-auto px-5">
          <h2 className="font-extrabold" style={midH}>{t.closing.title[lang]}</h2>
          <div className="mt-8 flex justify-center">
            <a href="#pricing" onClick={() => cta('closing')} className="cta cta-onteal"><span>{ctaLabel}</span><span className="cta-arrow">{arrow}</span></a>
          </div>
          <p className="mt-6 text-sm text-white/85">{t.closing.trust[lang]}</p>
        </div>
      </section>

      {/* ── 8  FAQs ── */}
      <section className="bg-white">
        <div className="site-wrap py-16 sm:py-24 grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
          <h2 className="font-extrabold text-charcoal" style={midH}>{t.faqTitle[lang]}</h2>
          <div className="border-t border-[var(--line)]"><Faq items={t.faq} lang={lang} /></div>
        </div>
      </section>

      <footer className="bg-charcoal text-white/70 pb-20 md:pb-0">
        <div className="site-wrap py-12 grid sm:grid-cols-2 gap-8">
          <div>
            <Wordmark size={30} tone="dark" />
            <p className="mt-3 text-xs text-white/60 leading-relaxed">{footer.brandTagline}</p>
            <p className="mt-3 text-xs text-white/45">{footer.brandPowered}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-teal mb-2">{footer.contactHead}</p>
            <a href="tel:+966550770711" dir="ltr" className="block text-sm text-white/80 hover:text-white w-fit py-1">{footer.phone}</a>
            <EmailLink className="block text-sm text-white/80 hover:text-white w-fit py-1" />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {footer.legal.map((l: { label: string; href: string }) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-xs text-white/55 hover:text-white/80 underline py-1">{l.label}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10"><div className="site-wrap py-4 text-xs text-white/45">{footer.copyright}</div></div>
      </footer>

      {/* Phones: the button stays within reach once the hero has scrolled away, until the price is on screen */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-[var(--line)] px-4 py-3 transition-transform duration-300 ${heroGone && !priceSeen ? 'translate-y-0' : 'translate-y-full'}`}
        aria-hidden={!(heroGone && !priceSeen)}
      >
        <a href="#pricing" onClick={() => cta('sticky')} tabIndex={heroGone && !priceSeen ? 0 : -1} className="cta cta-teal w-full"><span>{ctaLabel}</span><span className="cta-arrow">{arrow}</span></a>
      </div>
      {buying && <ParentBuyForm plan={buying} lang={lang} onClose={() => setBuying(null)} />}
    </div>
  )
}
