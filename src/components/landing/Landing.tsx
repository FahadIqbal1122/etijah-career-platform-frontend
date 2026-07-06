'use client'

// Landing — Etijahi marketing home. Full bilingual copy from src/data/landing.ts,
// rendered in the brand design language (ported from Design/src/landing-*.jsx).
// CTAs route to /assessment.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { L } from '@/data/landing'
import Logomark, { Wordmark } from '@/components/brand/Logomark'
import LandingConstellation from '@/components/brand/LandingConstellation'

// Render a headline, tealing the `hl` phrase inside it. Uses indexOf so text
// after a repeated phrase is never dropped.
function Highlight({ text, hl }: { text: string; hl?: string }) {
  const i = hl ? text.indexOf(hl) : -1
  if (!hl || i === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span className="text-teal">{hl}</span>
      {text.slice(i + hl.length)}
    </>
  )
}

// Fade-up on scroll into view — reveals immediately if already near the
// viewport on mount so above-the-fold content never flashes blank.
function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.classList.add('in')
      return
    }
    const r = el.getBoundingClientRect()
    if (r.top < (window.innerHeight || 800) * 0.95) {
      el.classList.add('in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref as React.RefObject<HTMLDivElement>
}

function Reveal({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`reveal-up ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── tiny geometric step icons (Electric Teal, simple shapes only) ──────────
const IconWho = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.4" /><path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
  </svg>
)
const IconBuild = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" /><path d="M4 12l8 4.5 8-4.5" /><path d="M4 16.5l8 4.5 8-4.5" />
  </svg>
)
const IconAct = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-2-1-3 1.5 2-5 2 1 3-1.5z" />
  </svg>
)
const STEP_ICONS = [IconWho, IconBuild, IconAct]

const IconMismatch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9.5 9.5 4 4M14.5 14.5 20 20" />
    <path d="M10.2 13.8a3 3 0 0 1 0-3.6M13.8 10.2a3 3 0 0 1 0 3.6" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export default function Landing() {
  const locale = useLocale()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const router = useRouter()
  const pathname = usePathname()
  const c = (L as any)[locale] ?? L.en
  const arrow = dir === 'rtl' ? '←' : '→'

  return (
    <div className="brand-surface text-charcoal" dir={dir}>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Wordmark size={30} />
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-charcoal/70">
            {c.nav.links.map((l: string, i: number) => {
              const href = ['/assessment', '#how', '#who', '#pricing'][i] ?? '#'
              return href.startsWith('/')
                ? <Link key={l} href={href} className="hover:text-teal">{l}</Link>
                : <a key={l} href={href} className="hover:text-teal">{l}</a>
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.replace(pathname, { locale: locale === 'en' ? 'ar' : 'en' })}
              className="text-xs font-medium text-charcoal/60 hover:text-teal border border-[var(--line-strong)] rounded-full px-3 py-1.5"
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <Link href="/assessment" className="cta cta-teal" style={{ padding: '9px 16px', fontSize: 14, borderRadius: 999 }}>
              {c.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-14 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <p className="eyebrow mb-4">{c.nav.tagline}</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-charcoal">
              {c.hero.headline[0]}<br />
              <Highlight text={c.hero.headline[1]} hl={c.hero.hl} />
            </h1>
            <p className="mt-6 text-lg text-charcoal/70 leading-relaxed max-w-xl">{c.hero.sub}</p>
            <p className="mt-4 text-xs text-charcoal/40 flex items-center gap-2">
              <span className="text-teal">✦</span>{c.hero.trust}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/assessment" className="cta">
                <span>{c.hero.cta}</span>
                <span className="cta-arrow">{arrow}</span>
              </Link>
              <a href="#how" className="text-sm font-semibold text-charcoal hover:text-teal">{c.hero.secondary}</a>
            </div>
          </Reveal>

          {/* live "discovering you" preview card */}
          <Reveal className="relative">
            <div className="absolute inset-[-8%] -z-10 opacity-90 pointer-events-none">
              <LandingConstellation lit={0.55} theme="light" accent="#00C9A7" />
            </div>
            <div className="hero-product-float card p-6 max-w-sm mx-auto relative z-10">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <span className="eyebrow !mb-0">{c.hero.preview.eyebrow}</span>
                <span className="font-mono text-[11px] text-charcoal/45 whitespace-nowrap">{c.hero.preview.progress}</span>
              </div>
              <div className="hp-bar"><div className="hp-bar-fill" /></div>
              <div className="qcard !mb-4 !p-5"><p className="qtext !text-lg">{c.hero.preview.question}</p></div>
              <div className="flex flex-col gap-2">
                {c.hero.preview.options.map((o: string, i: number) => (
                  <div key={o} className={`pill ${i === c.hero.preview.selected ? 'sel' : ''}`}>
                    <span className="pill-dot" />
                    <span className="pill-label">{o}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* hero stats — flat divided strip */}
        <Reveal className="max-w-6xl mx-auto px-5 pb-14">
          <div className="hero-stats-strip grid grid-cols-2 md:grid-cols-4">
            {c.hero.stats.map((s: any) => (
              <div key={s.label} className="hero-stat text-center px-3">
                <p className={`font-extrabold text-teal leading-none ${s.num.length > 5 ? 'text-2xl' : 'text-3xl'}`}>{s.num}</p>
                <p className="text-sm text-charcoal/60 mt-2.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </header>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <Section eyebrow={c.problem.label}>
        <Reveal>
          <h2 className="section-h">
            {c.problem.headline[0]}<br />
            <Highlight text={c.problem.headline[1]} hl={c.problem.hl} />
          </h2>
        </Reveal>
        <Reveal className="mt-7 flex flex-col gap-6">
          <p className="text-lg font-bold text-charcoal max-w-2xl">{c.problem.intro}</p>
          <p className="text-charcoal/70 leading-relaxed max-w-2xl">{c.problem.lead}</p>
          <ul className="grid sm:grid-cols-2 gap-3.5 max-w-2xl">
            {c.problem.items.map((it: string) => (
              <li key={it} className="flex items-center gap-4 card p-5">
                <span className="flex-none w-10 h-10 rounded-xl border-[1.5px] border-teal text-teal flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5">
                  <IconMismatch />
                </span>
                <span className="font-bold text-charcoal leading-snug">{it}</span>
              </li>
            ))}
          </ul>
          <p className="payoff max-w-2xl font-semibold text-charcoal leading-relaxed">{c.problem.payoff}</p>
        </Reveal>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <Section id="how" eyebrow={c.how.label} tint>
        <Reveal><h2 className="section-h"><Highlight text={c.how.headline} hl={c.how.hl} /></h2></Reveal>
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {c.how.steps.map((st: any, i: number) => {
            const Icon = STEP_ICONS[i]
            return (
              <Reveal key={st.n} className="card p-6" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mb-4 [&_svg]:w-6 [&_svg]:h-6">
                  <Icon />
                </div>
                <div className="text-teal font-mono font-medium text-xs tracking-[0.2em] mb-2">{st.n}</div>
                <h3 className="font-extrabold text-charcoal text-lg">{st.title}</h3>
                <p className="mt-2 text-sm text-charcoal/65 leading-relaxed">{st.body}</p>
              </Reveal>
            )
          })}
        </div>
        <Reveal className="mt-9 flex justify-center">
          <Link href="/assessment" className="cta cta-outline">{c.how.cta}</Link>
        </Reveal>
      </Section>

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────── */}
      <Section id="who" eyebrow={c.who.label}>
        <Reveal><h2 className="section-h max-w-3xl"><Highlight text={c.who.headline} hl={c.who.hl} /></h2></Reveal>
        <div className="mt-8 grid md:grid-cols-2 gap-5">
          {c.who.cards.map((card: any, i: number) => (
            <Reveal key={card.tag} className="card card-hover p-6" style={{ transitionDelay: `${(i % 2) * 90}ms` }}>
              <span className="chip chip-teal">{card.tag}</span>
              <h3 className="mt-4 font-extrabold text-charcoal text-lg leading-snug">{card.head}</h3>
              <p className="mt-2 text-sm text-charcoal/65 leading-relaxed">{card.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── HERITAGE / PROOF (dark charcoal) ─────────────────────────── */}
      <section className="sec-charcoal">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <Reveal>
            <p className="eyebrow !text-white/70">{c.heritage.label}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight max-w-2xl">
              {c.heritage.headline[0]}<br />
              <span className="text-teal">{c.heritage.headline[1]}</span>
            </h2>
          </Reveal>
          <Reveal className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {c.heritage.stats.map((s: any) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-teal">{s.num}</p>
                <p className="text-xs text-white/70 mt-1.5">{s.label}</p>
              </div>
            ))}
          </Reveal>
          <div className="mt-8 space-y-3 max-w-3xl text-white/80 leading-relaxed">
            {c.heritage.body.map((p: string) => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
          {c.heritage.founder?.credentials && (
            <Reveal className="mt-8 flex flex-wrap gap-2.5">
              {c.heritage.founder.credentials.map((cr: string) => (
                <span key={cr} className="chip chip-onteal">{cr}</span>
              ))}
            </Reveal>
          )}
          <div className="mt-8 grid md:grid-cols-2 gap-5">
            {c.heritage.testimonials.map((t: any, i: number) => (
              <Reveal key={t.role} className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-sm" style={{ transitionDelay: `${i * 90}ms` }}>
                <p className="text-white/90 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-teal text-charcoal font-bold grid place-items-center flex-none">{t.initials}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-xs text-white/60">{t.role}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <Section id="pricing" eyebrow={c.pricing.label} tint center>
        <Reveal><h2 className="section-h max-w-3xl mx-auto">{<Highlight text={c.pricing.headline} hl={c.pricing.hl} />}</h2></Reveal>
        <div className="mt-10 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-start text-start">
          <Reveal className="card p-7 relative">
            <p className="font-mono text-xs uppercase tracking-widest text-teal">{c.pricing.free.label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-charcoal">{c.pricing.free.price}</span>
              <span className="text-xs text-charcoal/45">{c.pricing.free.priceSub}</span>
            </div>
            <p className="mt-3 text-sm text-charcoal/65 leading-relaxed">{c.pricing.free.for}</p>
            <div className="h-px bg-[var(--line)] my-6" />
            <ul className="space-y-3.5 flex-1">
              {c.pricing.free.bullets.map((b: string) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-charcoal">
                  <span className="flex-none w-5 h-5 rounded-full bg-teal/15 text-teal text-[11px] font-black flex items-center justify-center mt-0.5">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/assessment" className="cta cta-outline mt-7 w-full">{c.pricing.free.cta}</Link>
          </Reveal>
          <Reveal className="pcard-paid rounded-[26px] p-7 relative" style={{ transitionDelay: '90ms' }}>
            <span className="pcard-badge absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">{c.pricing.paid.badge}</span>
            <p className="font-mono text-xs uppercase tracking-widest text-teal">{c.pricing.paid.label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{c.pricing.paid.price}</span>
              <span className="text-xs text-white/70">{c.pricing.paid.priceSub}</span>
            </div>
            <p className="mt-3 text-sm text-white/80 leading-relaxed">{c.pricing.paid.for}</p>
            <div className="h-px bg-white/16 my-6" />
            <ul className="space-y-3.5 flex-1">
              {c.pricing.paid.bullets.map((b: string) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-white/90">
                  <span className="flex-none w-5 h-5 rounded-full bg-teal/25 text-teal text-[11px] font-black flex items-center justify-center mt-0.5">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/assessment" className="cta mt-7 w-full !bg-white !text-primary !shadow-[0_16px_40px_-14px_rgba(0,0,0,0.4)]">{c.pricing.paid.cta}</Link>
          </Reveal>
        </div>
        <Reveal className="mt-8 text-sm text-charcoal/55 max-w-xl mx-auto text-center">{c.pricing.reassure}</Reveal>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <Section eyebrow={locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'} center>
        <Reveal><h2 className="section-h"><Highlight text={c.faq.headline} hl={c.faq.hl} /></h2></Reveal>
        <Reveal className="mt-8 max-w-3xl mx-auto border-t border-[var(--line)]">
          <FaqList items={c.faq.items} />
        </Reveal>
      </Section>

      {/* ── FINAL CTA (teal, glowing constellation) ───────────────────── */}
      <section className="sec-teal relative overflow-hidden text-center py-20 sm:py-28">
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none flex items-center justify-center">
          <div className="w-[min(900px,120%)] h-full">
            <LandingConstellation lit={1} theme="onblue" pulse />
          </div>
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-5">
          <Reveal className="flex justify-center mb-6"><Logomark size={48} tone="dark" glow /></Reveal>
          <Reveal><h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">{c.finalCta.headline}</h2></Reveal>
          <Reveal><p className="mt-4 text-white/85 text-lg max-w-[30ch] mx-auto">{c.finalCta.sub}</p></Reveal>
          <Reveal className="mt-8 flex justify-center">
            <Link href="/assessment" className="cta cta-onteal">
              <span>{c.finalCta.cta}</span>
              <span className="cta-arrow">{arrow}</span>
            </Link>
          </Reveal>
          <Reveal><p className="mt-6 text-xs text-white/65 max-w-[50ch] mx-auto">{c.finalCta.trust}</p></Reveal>
        </div>
      </section>

      {/* ── FOOTER (dark charcoal) ──────────────────────────────────── */}
      <footer className="bg-charcoal text-white/70">
        <div className="max-w-6xl mx-auto px-5 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <Wordmark size={30} tone="dark" />
            <p className="mt-3 text-xs text-white/60 leading-relaxed">{c.footer.brandTagline}</p>
            <p className="mt-3 text-xs text-white/45">{c.footer.brandPowered}</p>
            <div className="mt-5">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal mb-2">{c.footer.contactHead}</p>
              <a href="tel:+97435082446" dir="ltr" className="block text-sm text-white/80 hover:text-white w-fit">{c.footer.phone}</a>
              <a href={`mailto:${c.footer.email}`} className="block text-sm text-white/80 hover:text-white w-fit">{c.footer.email}</a>
            </div>
          </div>
          <FooterCol head={c.footer.colPlatform.head} links={c.footer.colPlatform.links} hrefs={['/assessment', '#how', '#pricing', '#who']} />
          <FooterCol head={c.footer.colCompany.head} links={c.footer.colCompany.links} />
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal mb-2">{c.footer.colLegal.head}</p>
            <p className="text-sm text-white/85 font-semibold mb-2">{c.footer.copyright}</p>
            <p className="text-xs text-white/55 leading-relaxed mb-2">{c.footer.legalLinks}</p>
            <p className="text-xs text-white/55 mb-3">{c.footer.registered}</p>
            <div className="space-y-1">
              {c.footer.social.map((s: string) => <p key={s} className="text-xs text-white/55">{s}</p>)}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 py-4 text-xs text-white/45">{c.footer.copyright}</div>
        </div>
      </footer>
    </div>
  )
}

function Section({
  id,
  eyebrow,
  tint,
  center,
  children,
}: {
  id?: string
  eyebrow: string
  tint?: boolean
  center?: boolean
  children: ReactNode
}) {
  return (
    <section id={id} className={`scroll-mt-20 ${tint ? 'bg-white' : ''}`}>
      <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
        <div className={center ? 'text-center' : ''}>
          <p className="eyebrow mb-3">{eyebrow}</p>
        </div>
        {children}
      </div>
    </section>
  )
}

function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(-1)
  return (
    <>
      {items.map((it, i) => (
        <div key={it.q} className={`faq-item border-b border-[var(--line)] ${open === i ? 'open' : ''}`}>
          <button
            className="w-full flex items-center gap-4 text-start py-5 font-extrabold text-charcoal hover:text-teal transition-colors"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
          >
            <span className="flex-1">{it.q}</span>
            <span className="faq-chev flex-none w-7 h-7 rounded-full bg-teal/12 text-teal flex items-center justify-center">
              <Chevron />
            </span>
          </button>
          <div className="faq-a-wrap">
            <div className="faq-a-inner">
              <p className="pb-5 text-sm text-charcoal/65 leading-relaxed">{it.a}</p>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function FooterCol({ head, links, hrefs }: { head: string; links: string[]; hrefs?: string[] }) {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal mb-2">{head}</p>
      <ul className="space-y-2.5">
        {links.map((l, i) => {
          const href = hrefs?.[i]
          return (
            <li key={l} className="text-sm text-white/75">
              {href
                ? href.startsWith('/')
                  ? <Link href={href} className="hover:text-white">{l}</Link>
                  : <a href={href} className="hover:text-white">{l}</a>
                : <span className="cursor-default">{l}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
