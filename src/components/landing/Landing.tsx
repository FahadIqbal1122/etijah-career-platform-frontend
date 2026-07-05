'use client'

// Landing — Etijahi marketing home. Full bilingual copy from src/data/landing.ts,
// rendered in the brand design language. CTAs route to /assessment.

import { useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { L } from '@/data/landing'
import Logomark, { Wordmark } from '@/components/brand/Logomark'
import Constellation from '@/components/brand/Constellation'

// Render a headline, bolding/tealing the `hl` phrase inside it. Uses indexOf so
// text after a repeated phrase is never dropped.
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
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Wordmark size={30} />
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-charcoal/70">
            {c.nav.links.map((l: string, i: number) => {
              const href = ['/assessment', '#how', '#who', '#pricing'][i] ?? '#'
              return href.startsWith('/')
                ? <Link key={l} href={href} className="hover:text-primary">{l}</Link>
                : <a key={l} href={href} className="hover:text-primary">{l}</a>
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.replace(pathname, { locale: locale === 'en' ? 'ar' : 'en' })}
              className="text-xs font-medium text-charcoal/60 hover:text-primary border border-[var(--line-strong)] rounded-full px-3 py-1.5"
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <Link href="/assessment" className="cta" style={{ padding: '9px 16px', fontSize: 14, borderRadius: 12 }}>
              {c.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-14 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-4">{c.nav.tagline}</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-charcoal">
              {c.hero.headline[0]}<br />
              <Highlight text={c.hero.headline[1]} hl={c.hero.hl} />
            </h1>
            <p className="mt-6 text-lg text-charcoal/70 leading-relaxed max-w-xl">{c.hero.sub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/assessment" className="cta">
                <span>{c.hero.cta}</span>
                <span className="cta-arrow">{arrow}</span>
              </Link>
              <a href="#how" className="text-sm font-medium text-charcoal/50 hover:text-primary">{c.hero.secondary}</a>
            </div>
            <p className="mt-6 text-xs text-charcoal/40">{c.hero.trust}</p>
          </div>

          {/* live "discovering you" preview card */}
          <div className="relative">
            <div className="card p-6 max-w-sm mx-auto">
              <div className="h-16 mb-4"><Constellation litCount={4} theme="teal" /></div>
              <p className="eyebrow text-center mb-1">{c.hero.preview.eyebrow}</p>
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
          </div>
        </div>

        {/* hero stats */}
        <div className="max-w-6xl mx-auto px-5 pb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {c.hero.stats.map((s: any) => (
              <div key={s.label} className="card p-5 text-center">
                <p className="text-2xl font-extrabold text-primary">{s.num}</p>
                <p className="text-xs text-charcoal/50 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <Section eyebrow={c.problem.label}>
        <h2 className="section-h">
          {c.problem.headline[0]}<br />
          <Highlight text={c.problem.headline[1]} hl={c.problem.hl} />
        </h2>
        <p className="mt-5 text-charcoal/70 leading-relaxed max-w-2xl">{c.problem.intro}</p>
        <p className="mt-3 font-semibold text-charcoal max-w-2xl">{c.problem.lead}</p>
        <div className="mt-6 grid sm:grid-cols-2 gap-3 max-w-2xl">
          {c.problem.items.map((it: string) => (
            <div key={it} className="flex items-start gap-2.5 card p-4">
              <span className="text-teal mt-0.5">✦</span>
              <span className="text-sm text-charcoal/80">{it}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-charcoal/70 leading-relaxed max-w-2xl">{c.problem.payoff}</p>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <Section id="how" eyebrow={c.how.label} tint>
        <h2 className="section-h"><Highlight text={c.how.headline} hl={c.how.hl} /></h2>
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {c.how.steps.map((st: any) => (
            <div key={st.n} className="card p-6">
              <div className="text-teal font-mono font-bold text-lg">{st.n}</div>
              <h3 className="mt-3 font-extrabold text-charcoal text-lg">{st.title}</h3>
              <p className="mt-2 text-sm text-charcoal/65 leading-relaxed">{st.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/assessment" className="cta cta-teal">{c.how.cta}</Link>
        </div>
      </Section>

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────── */}
      <Section id="who" eyebrow={c.who.label}>
        <h2 className="section-h max-w-3xl"><Highlight text={c.who.headline} hl={c.who.hl} /></h2>
        <div className="mt-8 grid md:grid-cols-2 gap-5">
          {c.who.cards.map((card: any) => (
            <div key={card.tag} className="card p-6">
              <span className="chip chip-teal">{card.tag}</span>
              <h3 className="mt-4 font-extrabold text-charcoal text-lg">{card.head}</h3>
              <p className="mt-2 text-sm text-charcoal/65 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── HERITAGE / PROOF ─────────────────────────────────────────── */}
      <section className="brand-hero">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <p className="eyebrow !text-white/70">{c.heritage.label}</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight max-w-2xl">
            {c.heritage.headline[0]}<br />
            <span className="text-teal">{c.heritage.headline[1]}</span>
          </h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {c.heritage.stats.map((s: any) => (
              <div key={s.label} className="bg-white/10 border border-white/15 rounded-2xl p-5 text-center backdrop-blur-sm">
                <p className="text-2xl font-extrabold">{s.num}</p>
                <p className="text-xs text-white/70 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-3 max-w-3xl text-white/80 leading-relaxed">
            {c.heritage.body.map((p: string) => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
          <div className="mt-8 grid md:grid-cols-2 gap-5">
            {c.heritage.testimonials.map((t: any) => (
              <div key={t.role} className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-white/90 leading-relaxed">“{t.quote}”</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-teal text-charcoal font-bold grid place-items-center">{t.initials}</span>
                  <span className="text-sm text-white/70">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <Section id="pricing" eyebrow={c.pricing.label} tint>
        <h2 className="section-h max-w-3xl"><Highlight text={c.pricing.headline} hl={c.pricing.hl} /></h2>
        <div className="mt-8 grid md:grid-cols-2 gap-5 max-w-4xl">
          {[c.pricing.free, c.pricing.paid].map((tier: any, i: number) => (
            <div key={tier.label} className={`card p-7 relative ${i === 1 ? 'ring-2 ring-teal' : ''}`}>
              {tier.badge && <span className="chip chip-solid absolute -top-3 start-6">{tier.badge}</span>}
              <p className="font-mono text-xs uppercase tracking-widest text-charcoal/50">{tier.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-charcoal">{tier.price}</span>
                <span className="text-xs text-charcoal/45">{tier.priceSub}</span>
              </div>
              <p className="mt-3 text-sm text-charcoal/60 leading-relaxed">{tier.for}</p>
              <ul className="mt-5 space-y-2">
                {tier.bullets.map((b: string) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-charcoal/75">
                    <span className="text-teal mt-0.5">✓</span>{b}
                  </li>
                ))}
              </ul>
              <Link href="/assessment" className={`cta mt-6 w-full ${i === 1 ? '' : 'cta-teal'}`} style={{ width: '100%' }}>
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-charcoal/55 max-w-2xl">{c.pricing.reassure}</p>
      </Section>

      {/* ── ABOUT ────────────────────────────────────────────────────── */}
      <Section eyebrow={c.about.label}>
        <h2 className="section-h max-w-3xl">{c.about.headline}</h2>
        <div className="mt-6 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4 text-charcoal/70 leading-relaxed">
            {c.about.body.map((p: string) => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
          <div className="card p-6 h-fit">
            <p className="font-bold text-charcoal mb-3">{c.about.photoCaption}</p>
            <ul className="space-y-2">
              {c.about.credentials.map((cr: string) => (
                <li key={cr} className="flex items-start gap-2 text-xs text-charcoal/60">
                  <span className="text-teal mt-0.5">✦</span>{cr}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <Section eyebrow={locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'} tint>
        <h2 className="section-h"><Highlight text={c.faq.headline} hl={c.faq.hl} /></h2>
        <div className="mt-8 grid md:grid-cols-2 gap-4 max-w-4xl">
          {c.faq.items.map((it: any) => (
            <div key={it.q} className="card p-5">
              <p className="font-bold text-charcoal">{it.q}</p>
              <p className="mt-2 text-sm text-charcoal/65 leading-relaxed">{it.a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="brand-hero">
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <div className="flex justify-center mb-6"><Logomark size={48} tone="dark" glow /></div>
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">{c.finalCta.headline}</h2>
          <p className="mt-4 text-white/75 text-lg">{c.finalCta.sub}</p>
          <div className="mt-8 flex justify-center">
            <Link href="/assessment" className="cta cta-teal">
              <span>{c.finalCta.cta}</span>
              <span className="cta-arrow">{arrow}</span>
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/50">{c.finalCta.trust}</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-5 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Wordmark size={30} />
            <p className="mt-3 text-xs text-charcoal/55">{c.footer.brandTagline}</p>
            <p className="mt-2 text-xs text-charcoal/45">{c.footer.brandPowered}</p>
          </div>
          <FooterCol head={c.footer.colPlatform.head} links={c.footer.colPlatform.links} hrefs={['/assessment', '#how', '#pricing', '#who']} />
          <FooterCol head={c.footer.colCompany.head} links={c.footer.colCompany.links} />
          <div>
            <p className="font-bold text-charcoal text-sm mb-3">{c.footer.contactHead}</p>
            <p className="text-xs text-charcoal/60">{c.footer.phone}</p>
            <p className="text-xs text-charcoal/60">{c.footer.email}</p>
            <div className="mt-3 space-y-1">
              {c.footer.social.map((s: string) => <p key={s} className="text-xs text-charcoal/50">{s}</p>)}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--line)] py-4 px-5 text-center">
          <p className="text-xs text-charcoal/45">{c.footer.copyright} · {c.footer.registered}</p>
          <p className="text-xs text-charcoal/40 mt-1">{c.footer.legalLinks}</p>
        </div>
      </footer>
    </div>
  )
}

function Section({ id, eyebrow, tint, children }: { id?: string; eyebrow: string; tint?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 ${tint ? 'bg-white' : ''}`}>
      <div className="max-w-6xl mx-auto px-5 py-16">
        <p className="eyebrow mb-3">{eyebrow}</p>
        {children}
      </div>
    </section>
  )
}

function FooterCol({ head, links, hrefs }: { head: string; links: string[]; hrefs?: string[] }) {
  return (
    <div>
      <p className="font-bold text-charcoal text-sm mb-3">{head}</p>
      <ul className="space-y-2">
        {links.map((l, i) => {
          const href = hrefs?.[i]
          return (
            <li key={l} className="text-xs text-charcoal/55">
              {href
                ? href.startsWith('/')
                  ? <Link href={href} className="hover:text-primary">{l}</Link>
                  : <a href={href} className="hover:text-primary">{l}</a>
                : <span className="cursor-default">{l}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
