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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import Logomark, { Wordmark } from '@/components/brand/Logomark'
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
`

// Same fade-up-on-scroll as the default landing page (Landing.tsx), so the two pages move the same way.
function Reveal({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window) || el.getBoundingClientRect().top < (window.innerHeight || 800) * 0.95) { el.classList.add('in'); return }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`reveal-up ${className}`} style={style}>{children}</div>
}

/** Headline in two lines, the second in teal, like the default landing's hero ("You know your child." / "Etijahi helps them..."). */
function TwoLine({ text }: { text: string }) {
  const m = text.match(/^([^]+?[.،])\s*([^]+)$/)
  if (!m) return <>{text}</>
  return <>{m[1]}<br /><span className="text-teal">{m[2]}</span></>
}

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
    <text x={x} y={y} textAnchor={anchor} fontSize="16" fontWeight="700" style={{ fontFamily: 'inherit', fill: 'var(--charcoal)' }}>{text}</text>
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
        <circle key={i} cx={mx(x)} cy={y} r={i % 2 ? 1.6 : 1.1} style={{ fill: 'var(--primary)' }} opacity=".3" />
      ))}
      <path d={path} pathLength={1} className="pp-thread" fill="none" stroke="#00C9A7" strokeWidth="4" strokeLinecap="round" />
      {/* you */}
      <g className="pp-node">
        <circle cx={A.x} cy={A.y} r="30" fill="url(#pp-glow)" />
        <circle cx={A.x} cy={A.y} r="9" style={{ fill: 'var(--primary)' }} />
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
        <circle cx={B.x} cy={B.y} r="11" style={{ fill: 'var(--primary)' }} />
        <circle cx={B.x} cy={B.y} r="4.5" fill="#fff" />
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
  // const nums = lang === 'ar' ? ['١', '٢', '٣'] : ['1', '2', '3']

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
  // const bigH = { fontSize: 'clamp(2.1rem, 5.4vw, 4.2rem)', lineHeight: lang === 'ar' ? 1.4 : 1.08, letterSpacing: lang === 'ar' ? 0 : '-0.03em', textWrap: 'balance' } as React.CSSProperties
  // const midH = { fontSize: 'clamp(1.7rem, 3.6vw, 2.8rem)', lineHeight: lang === 'ar' ? 1.4 : 1.12, letterSpacing: lang === 'ar' ? 0 : '-0.02em', textWrap: 'balance' } as React.CSSProperties

  const sectionH = 'section-h'
  const check = (cls = 'bg-teal/15 text-teal') => <span className={`flex-none w-5 h-5 rounded-full ${cls} text-[11px] font-black flex items-center justify-center mt-0.5`} aria-hidden="true">✓</span>

  return (
    <div dir={dir} lang={lang} className="brand-surface landing-root text-charcoal min-h-screen">
      <style>{CSS}</style>

      {/* ── NAV (same as the default landing) ── */}
      <nav className="sticky top-0 z-30 bg-white border-b border-[var(--line)]">
        <div className="site-wrap h-16 flex items-center justify-between gap-4">
          <Wordmark size={30} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.replace(pathname, { locale: lang === 'en' ? 'ar' : 'en' })}
              className="text-xs font-medium text-charcoal/60 hover:text-teal border border-[var(--line-strong)] rounded-full px-3 py-1.5"
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
            <a href="#pricing" onClick={() => cta('nav')} className="cta cta-teal" style={{ padding: '9px 16px', fontSize: 14, borderRadius: 999 }}>{t.nav.cta[lang]}</a>
          </div>
        </div>
      </nav>

      {/* ── HERO: light, headline in two lines with the second in teal, like the default landing ── */}
      <header ref={heroRef} className="relative overflow-hidden">
        <div className="site-wrap relative z-10 pt-12 pb-14 sm:pt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <Reveal>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-charcoal" style={{ textWrap: 'balance', ...(lang === 'ar' ? { lineHeight: 1.35, letterSpacing: 0 } : null) } as React.CSSProperties}>
              <TwoLine text={t.hero.headline[lang]} />
            </h1>
            <p className="mt-6 text-lg text-charcoal/80 leading-relaxed max-w-xl">{t.hero.sub[lang]}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#pricing" onClick={() => cta('hero')} className="cta"><span>{ctaLabel}</span><span className="cta-arrow">{arrow}</span></a>
              <DemoReportsButton locale={locale} source="parents_hero" track="parents_hero_sample_report" className="cta cta-outline cta-sm">{t.closing.sample[lang]}</DemoReportsButton>
            </div>
            <p className="mt-3 text-sm text-charcoal/80">{t.hero.note[lang]}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {t.hero.facts.map(f => <li key={f.en} className="chip chip-teal">{f[lang]}</li>)}
            </ul>
          </Reveal>
          <Reveal className="relative" style={{ transitionDelay: '120ms' }}>
            <div className="card p-6 sm:p-8 max-w-md mx-auto">
              <LinkPicture lang={lang} parent={t.how.cols[0].head[lang]} child={t.how.cols[1].head[lang]} together={t.how.cols[2].head[lang]} />
            </div>
          </Reveal>
        </div>
      </header>

      {/* ── THE PROBLEM ── */}
      <section className="bg-white border-y border-[var(--line)]">
        <div className="site-wrap py-16 sm:py-20 split">
          <Reveal><h2 className={`${sectionH} split-h`}>{t.problem.title[lang]}</h2></Reveal>
          <Reveal style={{ transitionDelay: '120ms' }}>
            <p className="text-charcoal/80 leading-relaxed text-[1.05rem]">{t.problem.p1[lang]}</p>
            <p className="payoff mt-5 font-semibold text-charcoal leading-relaxed">{t.problem.p2[lang]}</p>
          </Reveal>
        </div>
      </section>

      {/* ── THE SOLUTION: what the assessment looks at, and what it gives back ── */}
      <section className="scroll-mt-20">
        <div className="site-wrap py-16 sm:py-20">
          <Reveal><h2 className={`${sectionH} max-w-3xl`}>{t.solution.title[lang]}</h2></Reveal>
          <Reveal><p className="mt-5 text-charcoal/80 leading-relaxed text-[1.05rem] max-w-[62ch]">{t.solution.p1[lang]}</p></Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <Reveal className="card p-6">
              <ul className="grid grid-cols-2 gap-3 h-full">
                {t.solution.explores.map(x => (
                  <li key={x.en} className="rounded-2xl bg-lightblue px-4 py-4 font-bold text-charcoal leading-snug flex items-center">{x[lang]}</li>
                ))}
              </ul>
            </Reveal>
            <div className="flex lg:flex-col items-center justify-center text-teal text-3xl font-light" aria-hidden="true">
              <span className="lg:hidden">↓</span><span className="hidden lg:inline">{arrow}</span>
            </div>
            <Reveal className="pcard-paid rounded-[26px] p-6" style={{ transitionDelay: '90ms' }}>
              <ul className="space-y-3.5">
                {t.solution.shows.map(x => (
                  <li key={x.en} className="flex items-start gap-2.5 text-white font-bold leading-snug">{check('bg-teal/25 text-teal')}{x[lang]}</li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal><p className="mt-8 text-sm text-charcoal/70 max-w-[62ch]">{t.solution.p2[lang]}</p></Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS: three cards, the same shape as the landing's steps ── */}
      <section className="bg-white border-y border-[var(--line)]">
        <div className="site-wrap py-16 sm:py-20">
          <Reveal><h2 className={`${sectionH} max-w-3xl`}>{t.how.title[lang]}</h2></Reveal>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {t.how.cols.map((c, i) => (
              <Reveal key={c.head.en} className="card card-hover p-6" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="text-teal font-mono font-medium text-xs tracking-[0.2em] mb-2">0{i + 1}</div>
                <h3 className="font-extrabold text-charcoal text-lg">{c.head[lang]}</h3>
                <ul className="mt-3 space-y-3 text-sm text-charcoal/80 leading-relaxed">
                  {c.items.map(it => <li key={it.en}>{it[lang]}</li>)}
                </ul>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 card p-6 max-w-3xl"><p className="text-charcoal/85 leading-relaxed">{t.how.why[lang]}</p></Reveal>
        </div>
      </section>

      {/* ── WHAT YOU'LL READ TOGETHER ── */}
      <section>
        <div className="site-wrap py-16 sm:py-20 split">
          <Reveal>
            <h2 className={`${sectionH} split-h`}>{t.read.title[lang]}</h2>
            <p className="mt-5 text-charcoal/80 leading-relaxed text-[1.05rem] max-w-[44ch]">{t.read.coach[lang]}</p>
            <div className="mt-7">
              <DemoReportsButton locale={locale} source="parents_page" track="parents_sample_report" className="cta cta-outline">{t.closing.sample[lang]}</DemoReportsButton>
            </div>
          </Reveal>
          <Reveal className="card overflow-hidden" style={{ transitionDelay: '120ms' }}>
            <div className="px-6 pt-6">
              <p className="font-mono text-xs uppercase tracking-widest text-teal">{t.pricing.packageName[lang]}</p>
              <p className="mt-1 text-xl font-extrabold text-charcoal">{t.pricing.title[lang]}</p>
              <div className="h-px bg-[var(--line)] mt-5" />
            </div>
            <ul className="px-6 py-5 space-y-3.5">
              {t.read.items.map(it => (
                <li key={it.en} className="flex items-start gap-2.5 text-sm text-charcoal">{check()}{it[lang]}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── PRICING: the landing's two cards (blue featured card + plain card) ── */}
      <section id="pricing" ref={priceRef} className="bg-white border-y border-[var(--line)] scroll-mt-20">
        <div className="site-wrap py-16 sm:py-20">
          <div className="grid gap-6 md:grid-cols-2 items-start max-w-5xl mx-auto text-start">
            <Reveal className="pcard-paid rounded-[26px] p-7 relative flex flex-col" style={{ transitionDelay: '90ms' }}>
              <span className="pcard-badge absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">{t.pricing.packageName[lang]}</span>
              <h2 className="text-xl font-extrabold text-white">{t.pricing.title[lang]}</h2>
              <div className="mt-4 flex items-center gap-3 flex-wrap" dir="ltr" style={{ justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start' }}>
                {<span className="text-xl font-semibold text-white/60 line-through decoration-2 decoration-white/70">{priceWas}</span>}
                <span className="text-4xl font-extrabold text-white leading-none">{price}</span>
              </div>
              <p className="mt-3 text-sm text-white/80 leading-relaxed">{t.pricing.underPrice[lang]}</p>
              <div className="h-px bg-white/16 my-6" />
              <p className="text-sm text-white/90 leading-relaxed">{t.pricing.included[lang]}</p>
              <button
                type="button" disabled={!payOn} aria-disabled={!payOn}
                onClick={() => { track('parents_pay_click', { plan: 'pathfinder', lang, cta_variant: variantNo }); setBuying('pathfinder') }}
                className="cta mt-7 w-full !bg-white !text-primary !shadow-[0_16px_40px_-14px_rgba(0,0,0,0.4)]"
              >{payOn ? t.pricing.button[lang] : t.pricing.soon[lang]}</button>
              <p className="mt-4 text-xs text-white/75 leading-relaxed text-center">{t.pricing.underButton[lang]}</p>
            </Reveal>

            <Reveal className="card p-7 relative flex flex-col" style={{ transitionDelay: '180ms' }}>
              <h3 className="text-xl font-extrabold text-charcoal">{t.pricing.addOnName[lang]}</h3>
              <div className="mt-4 flex items-center gap-3 flex-wrap" dir="ltr" style={{ justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start' }}>
                {<span className="text-xl font-semibold text-charcoal/65 line-through decoration-2 decoration-charcoal/50">{coachWas}</span>}
                <span className="text-4xl font-extrabold text-charcoal leading-none">{coachPrice}</span>
              </div>
              <div className="h-px bg-[var(--line)] my-6" />
              <p className="text-sm text-charcoal/80 leading-relaxed">{t.pricing.addOn[lang]}</p>
              <button
                type="button" disabled={!payOn} aria-disabled={!payOn}
                onClick={() => { track('parents_pay_click', { plan: 'launchpad', lang, cta_variant: variantNo }); setBuying('launchpad_monthly') }}
                className="cta cta-outline mt-7 w-full"
              >{payOn ? t.pricing.addOnButton[lang] : t.pricing.soon[lang]}</button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="scroll-mt-20">
        <div className="site-wrap py-16 sm:py-20 split">
          <Reveal>
            <p className="eyebrow landing-eyebrow mb-3">{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</p>
            <h2 className={`${sectionH} split-h`}>{t.faqTitle[lang]}</h2>
          </Reveal>
          <Reveal style={{ transitionDelay: '120ms' }}><div className="border-t border-[var(--line)]"><Faq items={t.faq} lang={lang} /></div></Reveal>
        </div>
      </section>

      {/* ── CLOSING: the landing's blue band ── */}
      <section className="sec-teal relative overflow-hidden text-center py-20 sm:py-28">
        <HeroField tone="onteal" fadeMode="center" />
        <div className="relative z-10 max-w-2xl mx-auto px-5">
          <Reveal className="flex justify-center mb-6"><Logomark size={48} tone="dark" glow /></Reveal>
          <Reveal><h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">{t.closing.title[lang]}</h2></Reveal>
          <Reveal className="mt-8 flex justify-center">
            <a href="#pricing" onClick={() => cta('closing')} className="cta cta-onteal"><span>{ctaLabel}</span><span className="cta-arrow">{arrow}</span></a>
          </Reveal>
          <Reveal><p className="mt-6 text-xs text-white/65 max-w-[50ch] mx-auto">{t.closing.trust[lang]}</p></Reveal>
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
