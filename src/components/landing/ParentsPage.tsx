'use client'

// Parent campaign page (/[locale]/parents-v2): the 8-section page from the "Etijahi Parent Campaign" doc. Copy lives in
// src/data/parentsPage.ts. Not yet the live /parents page: the parent-pays-first flow (pay, receive the child's link) does not
// exist yet, so the pay buttons stay switched off until it does. Flip PAY_FLOW_READY and wire onPay when it is built.

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { Wordmark } from '@/components/brand/Logomark'
import DemoReportsButton from '@/components/shared/DemoReportsButton'
import EmailLink from '@/components/shared/EmailLink'
import { L } from '@/data/landing'
import { PARENTS, type Bi } from '@/data/parentsPage'
import { formatPrice } from '@/lib/pricing'
import { useDisplayCurrency } from '@/lib/useDisplayCurrency'
import { setLandingVariant, track, trackOnce } from '@/lib/analytics'

const PAY_FLOW_READY = false   // true once a parent can pay first and receive the child's personal link

function Faq({ items, lang }: { items: { q: Bi; a: Bi }[]; lang: 'en' | 'ar' }) {
  const [open, setOpen] = useState(-1)
  return (
    <>
      {items.map((it, i) => (
        <div key={it.q.en} className={`faq-item border-b border-[var(--line)] ${open === i ? 'open' : ''}`}>
          <button
            className="w-full flex items-center gap-4 text-start py-5 font-extrabold text-charcoal hover:text-teal transition-colors"
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
  const footer = ((L as Record<string, any>)[lang] ?? L.en).footer
  const t = PARENTS

  useEffect(() => {
    setLandingVariant('parents')
    trackOnce('parents_page_view', 'parents_page_view', { lang })
  }, [lang])

  const cta = (where: string) => track('parents_cta_click', { where, lang })
  const ctaClass = 'cta cta-teal'

  return (
    <div dir={dir} lang={lang} className="min-h-screen bg-[var(--bg,#fff)]">
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
            <a href="#pricing" onClick={() => cta('nav')} className={ctaClass} style={{ padding: '9px 16px', fontSize: 14, borderRadius: 999 }}>{t.nav.cta[lang]}</a>
          </div>
        </div>
      </nav>

      {/* 1 + 2: headline, supporting headline, button */}
      <header className="bg-white">
        <div className="site-wrap py-16 sm:py-24 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-charcoal" style={{ textWrap: 'balance' } as React.CSSProperties}>{t.hero.headline[lang]}</h1>
          <p className="mt-6 text-lg text-charcoal/80 leading-relaxed max-w-[60ch]">{t.hero.sub[lang]}</p>
          <div className="mt-8">
            <a href="#pricing" onClick={() => cta('hero')} className={ctaClass}><span>{t.hero.cta[lang]}</span><span className="cta-arrow">{arrow}</span></a>
            <p className="mt-3 text-sm text-charcoal/65">{t.hero.note[lang]}</p>
          </div>
        </div>
      </header>

      {/* 3: the problem */}
      <section className="bg-white border-t border-[var(--line)]">
        <div className="site-wrap py-14 sm:py-20 max-w-3xl">
          <h2 className="section-h">{t.problem.title[lang]}</h2>
          <p className="mt-5 text-charcoal/80 leading-relaxed">{t.problem.p1[lang]}</p>
          <p className="mt-4 text-charcoal/80 leading-relaxed">{t.problem.p2[lang]}</p>
        </div>
      </section>

      {/* 4: the solution */}
      <section className="border-t border-[var(--line)]">
        <div className="site-wrap py-14 sm:py-20 max-w-3xl">
          <h2 className="section-h">{t.solution.title[lang]}</h2>
          <p className="mt-5 text-charcoal/80 leading-relaxed">{t.solution.p1[lang]}</p>
          <p className="mt-4 text-charcoal/80 leading-relaxed">{t.solution.p2[lang]}</p>
        </div>
      </section>

      {/* 5: how it works */}
      <section className="bg-white border-t border-[var(--line)]">
        <div className="site-wrap py-14 sm:py-20">
          <h2 className="section-h max-w-3xl">{t.how.title[lang]}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {t.how.cols.map((c, i) => (
              <div key={c.head.en} className="rounded-2xl border border-[var(--line)] p-6">
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal mb-3">{(lang === 'ar' ? ['١', '٢', '٣'] : ['1', '2', '3'])[i]} · {c.head[lang]}</p>
                <ul className="space-y-3 text-charcoal/80 leading-relaxed text-sm">
                  {c.items.map(it => <li key={it.en}>{it[lang]}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-charcoal/70 max-w-3xl leading-relaxed">{t.how.why[lang]}</p>
        </div>
      </section>

      {/* 6 + 6b: what you'll read together, pricing card */}
      <section id="pricing" className="border-t border-[var(--line)] scroll-mt-20">
        <div className="site-wrap py-14 sm:py-20 grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <h2 className="section-h">{t.read.title[lang]}</h2>
            <ul className="mt-6 space-y-3">
              {t.read.items.map(it => (
                <li key={it.en} className="flex gap-3 text-charcoal/80 leading-relaxed">
                  <span className="text-teal flex-none" aria-hidden="true">✓</span><span>{it[lang]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-charcoal/70">{t.read.coach[lang]}</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--line-strong)] bg-white p-7 shadow-sm">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal">{t.pricing.packageName[lang]}</p>
              <h3 className="mt-2 text-xl font-extrabold text-charcoal">{t.pricing.title[lang]}</h3>
              <p className="mt-4 text-3xl font-extrabold text-charcoal">
                <span className="me-2 text-lg font-normal text-charcoal/50 line-through" dir="ltr">{priceWas}</span>
                <span dir="ltr">{price}</span>
              </p>
              <p className="mt-1 text-sm text-charcoal/65">{t.pricing.underPrice[lang]}</p>
              <p className="mt-4 text-sm text-charcoal/80">{t.pricing.included[lang]}</p>
              <button
                type="button" disabled={!PAY_FLOW_READY} aria-disabled={!PAY_FLOW_READY}
                onClick={() => { track('parents_pay_click', { plan: 'pathfinder', lang }) }}
                className={`${ctaClass} mt-5 w-full justify-center ${PAY_FLOW_READY ? '' : 'opacity-60 cursor-not-allowed'}`}
              >{PAY_FLOW_READY ? t.pricing.button[lang] : t.pricing.soon[lang]}</button>
              <p className="mt-3 text-xs text-charcoal/65">{t.pricing.underButton[lang]}</p>
            </div>

            <div className="rounded-3xl border border-[var(--line)] bg-white p-6">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal">Launchpad</p>
              <h3 className="mt-2 text-lg font-extrabold text-charcoal">{t.pricing.addOnName[lang]}</h3>
              <p className="mt-2 text-sm text-charcoal/80 leading-relaxed">{t.pricing.addOn[lang]}</p>
              <p className="mt-3 text-2xl font-extrabold text-charcoal">
                <span className="me-2 text-base font-normal text-charcoal/50 line-through" dir="ltr">{coachWas}</span>
                <span dir="ltr">{coachPrice}</span>
              </p>
              <button
                type="button" disabled={!PAY_FLOW_READY} aria-disabled={!PAY_FLOW_READY}
                onClick={() => { track('parents_pay_click', { plan: 'launchpad', lang }) }}
                className={`cta cta-sm mt-4 w-full justify-center ${PAY_FLOW_READY ? '' : 'opacity-60 cursor-not-allowed'}`}
              >{PAY_FLOW_READY ? t.pricing.addOnButton[lang] : t.pricing.soon[lang]}</button>
            </div>
          </div>
        </div>
      </section>

      {/* 7: closing call to action */}
      <section className="sec-teal text-center py-16 sm:py-24">
        <div className="max-w-2xl mx-auto px-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">{t.closing.title[lang]}</h2>
          <div className="mt-8 flex justify-center">
            <a href="#pricing" onClick={() => cta('closing')} className="cta cta-onteal"><span>{t.closing.cta[lang]}</span><span className="cta-arrow">{arrow}</span></a>
          </div>
          <p className="mt-6 text-sm text-white/80">
            {t.closing.trust[lang]} ·{' '}
            <DemoReportsButton locale={locale} source="parents_page" track="parents_sample_report" className="underline hover:text-white inline-block py-2">{t.closing.sample[lang]}</DemoReportsButton>
          </p>
        </div>
      </section>

      {/* 8: FAQs */}
      <section className="bg-white border-y border-[var(--line)]">
        <div className="site-wrap py-14 sm:py-20 max-w-3xl">
          <h2 className="section-h mb-6">{t.faqTitle[lang]}</h2>
          <div className="border-t border-[var(--line)]"><Faq items={t.faq} lang={lang} /></div>
        </div>
      </section>

      <footer className="bg-charcoal text-white/70">
        <div className="site-wrap py-12 grid sm:grid-cols-2 gap-8">
          <div>
            <Wordmark size={30} tone="dark" />
            <p className="mt-3 text-xs text-white/60 leading-relaxed">{footer.brandTagline}</p>
            <p className="mt-3 text-xs text-white/45">{footer.brandPowered}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal mb-2">{footer.contactHead}</p>
            <a href="tel:+966550770711" dir="ltr" className="block text-sm text-white/80 hover:text-white w-fit">{footer.phone}</a>
            <EmailLink className="block text-sm text-white/80 hover:text-white w-fit" />
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
              {footer.legal.map((l: { label: string; href: string }) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-xs text-white/55 hover:text-white/80 underline">{l.label}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10"><div className="site-wrap py-4 text-xs text-white/45">{footer.copyright}</div></div>
      </footer>
    </div>
  )
}
