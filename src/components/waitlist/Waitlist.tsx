'use client'

// Waitlist — pre-launch page. Explains what Etijahi is and how it works, and
// collects emails into a dedicated `waitlist_signups` table (kept separate
// from feedback_responses / assessment data). Same brand design language as
// components/landing/Landing.tsx.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { W } from '@/data/waitlist'
import { getCountryOptions } from '@/data/countryCodes'
import Logomark, { Wordmark } from '@/components/brand/Logomark'
import LandingConstellation from '@/components/brand/LandingConstellation'
import SearchableSelect from '@/components/waitlist/SearchableSelect'

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

function Section({ id, eyebrow, tint, center, children }: {
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

// ── step icons (reused geometry from the landing page) ─────────────────────
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

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

type FormState = 'idle' | 'submitting' | 'done' | 'error'

// Shared email-capture form, used in the hero and the closing CTA. Each
// instance owns its own state so submitting one doesn't affect the other.
function WaitlistForm({ c, locale, onJoined, tone = 'light' }: {
  c: any
  locale: string
  onJoined: () => void
  tone?: 'light' | 'onteal'
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [nationality, setNationality] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('')
  const [age, setAge] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const countryOptions = useMemo(() => getCountryOptions(locale), [locale])
  const errCls = (key: string) => (errors[key] ? ' !border-red-500' : '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const nextErrors = {
      email: !emailValid,
      name: !name.trim(),
      country: !country,
      status: !status,
      nationality: !nationality,
      age: !age,
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      setState('error')
      return
    }
    setState('submitting')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          country,
          nationality: nationality.trim(),
          phone: phone.trim() ? `+${phone.trim()}` : null,
          status,
          age,
          locale,
          source: 'waitlist_page',
        }),
      })
      if (!res.ok) throw new Error('failed')
      setState('done')
      onJoined()
    } catch {
      setState('error')
    }
  }

  const light = tone === 'light'
  const fieldBase = `w-full text-sm rounded-full py-3.5 border transition-colors focus:outline-none focus:ring-2 ${
    light
      ? `bg-white text-charcoal border-[var(--line-strong)] focus:ring-teal/20`
      : `bg-white/12 backdrop-blur-md text-white placeholder:text-white/60 border-white/25 focus:ring-white/30`
  }`
  const fieldCls = `${fieldBase} px-5`
  // native <select> arrows are rendered by the browser with their own
  // (unequal, non-adjustable) inset — appearance-none strips that and we draw
  // our own Chevron, positioned to match the text's start-side padding so the
  // margins on both sides of the pill are actually equal
  const selectCls = `${fieldBase} ps-5 pe-11 appearance-none`
  const phoneInputCls = `!w-full !h-[46px] !text-sm !rounded-full ${
    light
      ? '!bg-white !text-charcoal !border-[var(--line-strong)]'
      : '!bg-white/12 !backdrop-blur-md !text-white !border-white/25'
  }`
  const phoneButtonCls = `!rounded-s-full ${light ? '!bg-white !border-[var(--line-strong)]' : '!bg-white/12 !backdrop-blur-md !border-white/25'}`

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 w-full max-w-md">
      <div>
        <label className="sr-only">{c.formLabel}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: false })) }}
          placeholder={c.placeholder}
          className={fieldCls + errCls('email')}
        />
      </div>
      <div>
        <label className="sr-only">{c.namePlaceholder}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })) }}
          placeholder={c.namePlaceholder}
          className={fieldCls + errCls('name')}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchableSelect
          options={countryOptions}
          value={country}
          onChange={(v) => { setCountry(v); setErrors((p) => ({ ...p, country: false })) }}
          placeholder={c.countryPlaceholder}
          className={`${fieldCls} flex-1${errCls('country')}`}
        />
        <div className="relative flex-1">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setErrors((p) => ({ ...p, status: false })) }}
            className={`${selectCls} w-full${errCls('status')}`}
          >
            <option value="" disabled>{c.statusPlaceholder}</option>
            {c.statuses.map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className={`pointer-events-none absolute end-5 top-1/2 -translate-y-1/2 ${light ? 'text-charcoal/40' : 'text-white/60'}`}>
            <Chevron />
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchableSelect
          options={countryOptions}
          value={nationality}
          onChange={(v) => { setNationality(v); setErrors((p) => ({ ...p, nationality: false })) }}
          placeholder={c.nationalityPlaceholder}
          className={`${fieldCls} flex-1${errCls('nationality')}`}
        />
        <div className="relative flex-1">
          <label className="sr-only">{c.agePlaceholder}</label>
          <select
            value={age}
            onChange={(e) => { setAge(e.target.value); setErrors((p) => ({ ...p, age: false })) }}
            className={`${selectCls} w-full${errCls('age')}`}
          >
            <option value="" disabled>{c.agePlaceholder}</option>
            {c.ages.map((opt: any) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className={`pointer-events-none absolute end-5 top-1/2 -translate-y-1/2 ${light ? 'text-charcoal/40' : 'text-white/60'}`}>
            <Chevron />
          </span>
        </div>
      </div>
      <div dir="ltr">
        <label className="sr-only">{c.phonePlaceholder}</label>
        <PhoneInput
          country="bh"
          value={phone}
          onChange={(val) => setPhone(val)}
          placeholder={c.phonePlaceholder}
          containerClass="!w-full"
          inputClass={phoneInputCls}
          buttonClass={phoneButtonCls}
        />
      </div>
      <button
        type="submit"
        disabled={state === 'submitting'}
        className={light ? 'cta cta-teal justify-center' : 'cta cta-onteal justify-center'}
        style={{ padding: '13px 24px', fontSize: 14, borderRadius: 999 }}
      >
        {state === 'submitting' ? c.ctaLoading : c.cta}
      </button>
      {state === 'error' && (
        <p className={`text-xs ${light ? 'text-red-500' : 'text-red-200'}`}>
          {locale === 'ar'
            ? `يرجى تصحيح الحقول التالية: ${
                [
                  errors.email && 'البريد الإلكتروني',
                  errors.name && 'الاسم',
                  errors.country && c.countryPlaceholder,
                  errors.status && c.statusPlaceholder,
                  errors.nationality && c.nationalityPlaceholder,
                  errors.age && c.agePlaceholder,
                ].filter(Boolean).join('، ')
              }`
            : `Please fix the following: ${
                [
                  errors.email && 'Email',
                  errors.name && 'Name',
                  errors.country && c.countryPlaceholder,
                  errors.status && c.statusPlaceholder,
                  errors.nationality && c.nationalityPlaceholder,
                  errors.age && c.agePlaceholder,
                ].filter(Boolean).join(', ')
              }`}
        </p>
      )}
    </form>
  )
}

export default function Waitlist() {
  const locale = useLocale()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const router = useRouter()
  const pathname = usePathname()
  const c = (W as any)[locale] ?? W.en
  const [joined, setJoined] = useState(false)

  return (
    <div className="brand-surface text-charcoal" dir={dir}>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Wordmark size={30} />
          <button
            onClick={() => router.replace(pathname, { locale: locale === 'en' ? 'ar' : 'en' })}
            className="text-xs font-medium text-charcoal/60 hover:text-teal border border-[var(--line-strong)] rounded-full px-3 py-1.5"
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </nav>

      {/* ── HERO / EMAIL CAPTURE ────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-5 pt-16 pb-14 text-center">
          <Reveal>
            <p className="eyebrow mb-4 justify-center inline-flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-teal/10 border border-teal/30 !text-[13px] tracking-[0.15em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
              </span>
              {c.hero.eyebrow}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-charcoal">
              {c.hero.headline[0]}<br />
              <Highlight text={c.hero.headline[1]} hl={c.hero.hl} />
            </h1>
            <p className="mt-6 text-lg text-charcoal/70 leading-relaxed max-w-xl mx-auto">{c.hero.sub}</p>
          </Reveal>

          <Reveal className="mt-8 flex flex-col items-center gap-3">
            {joined ? (
              <div className="card p-6 max-w-md text-center">
                <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4E4E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="font-extrabold text-charcoal text-lg mb-1.5">{c.success.headline}</h2>
                <p className="text-sm text-charcoal/65 leading-relaxed">{c.success.body}</p>
              </div>
            ) : (
              <WaitlistForm c={c.hero} locale={locale} onJoined={() => setJoined(true)} />
            )}
            <p className="text-sm text-charcoal/55 flex items-center gap-2">
              <span className="text-teal">✦</span>{c.hero.trust}
            </p>
          </Reveal>
        </div>

        <Reveal className="max-w-6xl mx-auto px-5 pb-14">
          <div className="hero-stats-strip grid grid-cols-1 sm:grid-cols-3">
            {c.hero.stats.map((s: any) => (
              <div key={s.label} className="hero-stat text-center px-3">
                <p className={`font-extrabold text-teal leading-none ${s.num.length > 5 ? 'text-2xl' : 'text-3xl'}`}>{s.num}</p>
                <p className="text-sm text-charcoal/60 mt-2.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </header>

      {/* ── WHAT IS ETIJAHI? ─────────────────────────────────────────── */}
      <Section eyebrow={c.whatIsIt.label} tint>
        <div className="grid md:grid-cols-3 gap-5">
          {c.whatIsIt.blocks.map((b: any, i: number) => (
            <Reveal key={b.head} className="card p-6" style={{ transitionDelay: `${i * 90}ms` }}>
              <h3 className="font-extrabold text-charcoal text-lg">{b.head}</h3>
              <p className="mt-2 text-sm text-charcoal/65 leading-relaxed">{b.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── NOT JUST WHAT PAYS ───────────────────────────────────────── */}
      <section className="bg-white border-y border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-5 py-14 text-center">
          <Reveal>
            <h2 className="section-h">
              {c.notJustWhatPays.headline[0]}<br />
              <Highlight text={c.notJustWhatPays.headline[1]} hl={c.notJustWhatPays.hl} />
            </h2>
            <p className="mt-4 text-charcoal/70 leading-relaxed">{c.notJustWhatPays.body}</p>
          </Reveal>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────── */}
      <Section eyebrow={c.problem.label}>
        <Reveal>
          <h2 className="section-h">
            {c.problem.headline[0]}<br />
            <Highlight text={c.problem.headline[1]} hl={c.problem.hl} />
          </h2>
        </Reveal>
        <Reveal className="mt-7 flex flex-col gap-5">
          <p className="text-lg font-bold text-charcoal max-w-2xl">{c.problem.body[0]}</p>
          <p className="text-charcoal/70 leading-relaxed max-w-2xl">{c.problem.body[1]}</p>
          <p className="payoff max-w-2xl font-semibold text-charcoal leading-relaxed">{c.problem.body[2]}</p>
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
      </Section>

      {/* ── INSIDE YOUR REPORT ───────────────────────────────────────── */}
      <Section id="report" eyebrow={c.insideReport.label} tint>
        <Reveal>
          <h2 className="section-h max-w-2xl"><Highlight text={c.insideReport.headline} hl={c.insideReport.hl} /></h2>
          <p className="mt-4 text-charcoal/70 leading-relaxed max-w-xl">{c.insideReport.intro}</p>
        </Reveal>
        <Reveal>
          <ul className="mt-8 grid sm:grid-cols-2 gap-3.5 max-w-3xl">
            {c.insideReport.items.map((it: string) => (
              <li key={it} className="flex items-start gap-2.5 card p-5 text-sm text-charcoal">
                <span className="flex-none w-5 h-5 rounded-full bg-teal/15 text-teal text-[11px] font-black flex items-center justify-center mt-0.5">✓</span>
                {it}
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      {/* ── BUILT FOR THE GULF ───────────────────────────────────────── */}
      <Section eyebrow={c.builtForGulf.label} tint>
        <Reveal>
          <h2 className="section-h max-w-2xl">{c.builtForGulf.headline}</h2>
          <p className="mt-3 text-charcoal/70 leading-relaxed max-w-xl">{c.builtForGulf.localisationLine}</p>
        </Reveal>
        <div className="mt-8 grid sm:grid-cols-2 gap-5">
          {c.builtForGulf.pillars.map((p: any, i: number) => (
            <Reveal key={p.title} className="card p-6" style={{ transitionDelay: `${(i % 2) * 90}ms` }}>
              <h3 className="font-extrabold text-charcoal text-base">{p.title}</h3>
              <p className="mt-2 text-sm text-charcoal/65 leading-relaxed">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────── */}
      <Section eyebrow={c.who.label}>
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
      <section id="about" className="sec-charcoal scroll-mt-20">
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

      {/* ── FOR INSTITUTIONS (compact band) ──────────────────────────── */}
      <section className="bg-white border-y border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-5 py-14 text-center">
          <Reveal>
            <p className="eyebrow mb-3">{c.institutions.label}</p>
            <h2 className="section-h max-w-2xl mx-auto">{c.institutions.headline}</h2>
            <p className="mt-4 text-charcoal/70 leading-relaxed max-w-2xl mx-auto">{c.institutions.body}</p>
            <a href="/contact" className="cta cta-outline mt-7 inline-flex">{c.institutions.cta}</a>
          </Reveal>
        </div>
      </section>

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
        <div className="relative z-10 max-w-2xl mx-auto px-5 flex flex-col items-center">
          <Reveal className="flex justify-center mb-6"><Logomark size={48} tone="dark" glow /></Reveal>
          <Reveal><h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">{c.finalCta.headline}</h2></Reveal>
          <Reveal><p className="mt-4 text-white/85 text-lg max-w-[30ch] mx-auto">{c.finalCta.sub}</p></Reveal>
          <Reveal className="mt-8 flex justify-center">
            {joined ? (
              <p className="text-white font-semibold">{c.success.headline}</p>
            ) : (
              <WaitlistForm c={c.hero} locale={locale} onJoined={() => setJoined(true)} tone="onteal" />
            )}
          </Reveal>
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
              <a href="tel:+97335082446" dir="ltr" className="block text-sm text-white/80 hover:text-white w-fit">{c.footer.phone}</a>
              <a href={`mailto:${c.footer.email}`} className="block text-sm text-white/80 hover:text-white w-fit">{c.footer.email}</a>
            </div>
          </div>
          <FooterCol head={c.footer.colPlatform.head} links={c.footer.colPlatform.links} hrefs={['#how', '#report']} />
          <FooterCol head={c.footer.colCompany.head} links={c.footer.colCompany.links} hrefs={['#about']} />
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
