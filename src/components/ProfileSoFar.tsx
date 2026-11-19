'use client'

// "Your profile so far": shown at the top of the pay screen so people see something personal before they are asked to pay.
// Only what is really scored by then is shown: top interests (Holland RIASEC) and personality (Big Five).
// Strengths and work style are scored after the gate.

const STR = {
  en: {
    kicker: 'Your profile so far',
    head: (n: string) => n ? `Here is what we learned about you, ${n}` : 'Here is what we learned about you',
    sub: 'Based on your answers so far', interests: 'Top interests', personality: 'Personality',
    cta: 'Complete your journey to unlock your full career path',
  },
  ar: {
    kicker: 'ملفك حتى الآن',
    head: (n: string) => n ? `هذا ما عرفناه عنك يا ${n}` : 'هذا ما عرفناه عنك',
    sub: 'بناءً على إجاباتك حتى الآن', interests: 'أبرز ميولك', personality: 'الشخصية',
    cta: 'أكمل رحلتك لتفتح مسارك المهني الكامل',
  },
} as const

export default function ProfileSoFar({ locale, name, interests, personality }: {
  locale: string
  name: string
  interests: [string, string][]                // top interest types as [name, one-line description], already translated
  personality: [string, string][]              // top personality traits as [name, one-line description]
}) {
  const s = STR[locale === 'ar' ? 'ar' : 'en']
  if (interests.length === 0 && personality.length === 0) return null

  const label = 'text-[11px] font-semibold uppercase tracking-wider text-primary'

  const block = (title: string, rows: [string, string][], accent: boolean) => rows.length > 0 && (
    <div className={accent ? 'rounded-2xl border border-teal/50 bg-[#E8FAF6] p-4 shadow-sm' : 'rounded-2xl bg-white border border-[var(--line)] p-4 shadow-sm'}>
      <p className={label}>{title}</p>
      <div className="mt-2 space-y-3">
        {rows.map(([n, line]) => (
          <div key={n}>
            <p className="text-lg font-extrabold text-charcoal">{n}</p>
            <p className="text-sm text-charcoal/70">{line}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <section>
      <p className="text-center lg:text-start text-xs font-semibold uppercase tracking-widest text-primary">{s.kicker}</p>
      <h2 className="mt-1.5 text-center lg:text-start text-xl lg:text-2xl font-extrabold text-charcoal">{s.head(name)}</h2>
      <p className="mt-1 text-center lg:text-start text-sm text-charcoal/60">{s.sub}</p>
      <div className="mt-4 grid gap-3">
        {block(s.interests, interests, false)}
        {block(s.personality, personality, true)}
      </div>
      <p className="mt-4 text-center lg:text-start text-base font-bold text-charcoal">{s.cta}</p>
    </section>
  )
}
