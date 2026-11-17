'use client'
import { useEffect, useState } from 'react'
import { L } from '@/data/landing'
import { Wordmark } from '@/components/brand/Logomark'

// Shown on the very first assessment question only (see AssessmentForm showIntroProof).
//  variant 'side'   : testimonial (desktop only) + "who we've worked with" moving logo bar
//  variant 'bottom' : phone only, a small testimonial box under the question

// Company logos (files in public/clients/). Centre = biggest names, as Dina asked.
// Coursera only exists inside a combined "Supported by" banner, so it is cropped with CSS (.intro-proof-coursera)
// until a standalone logo file is added: then replace it with { name: 'Coursera', src: '/clients/coursera.png' }.
const LOGOS: { name: string; src?: string }[] = [
  { name: 'Tamkeen', src: '/clients/tamkeen.jpg' },
  { name: 'Zain', src: '/clients/zain.jpg' },
  { name: 'NBB', src: '/clients/nbb.jpg' },
  { name: 'STC', src: '/clients/stc.jpg' },
  { name: 'Coursera' },
]

// One sentence per review (Dina: "take a sentence from each"). Word-for-word parts of the original reviews.
const SHORT: Record<string, { en: string; ar: string }> = {
  'Ahmed A.': {
    en: 'It helped me learn more about my interests and abilities and identify the fields that suit me.',
    ar: 'ساعدتني على التعرف أكثر على اهتماماتي وقدراتي وتحديد المجالات التي تناسبني.',
  },
  'Maryam O.': {
    en: 'It made me see my strengths and weaknesses, and I will work on strengthening them.',
    ar: 'جعلني أرى نقاط قوتي وضعفي، وسأعمل على تعزيزها.',
  },
}

// One line about the assessment and its goal, shown under the logo.
const ONE_LINER = {
  en: 'A 15-minute assessment to help you find a career direction that truly fits you.',
  ar: 'تقييم في ١٥ دقيقة لمساعدتك على اكتشاف اتجاه مهني يناسبك فعلاً.',
}

function Logo({ l, hidden }: { l: { name: string; src?: string }; hidden?: boolean }) {
  return (
    <span className="intro-proof-tile" {...(hidden ? { 'aria-hidden': true } : { role: 'img', 'aria-label': l.name })}>
      {l.src ? <img src={l.src} alt="" /> : <span className="intro-proof-coursera" />}
    </span>
  )
}

export default function IntroProof({ locale, variant = 'side' }: { locale: 'en' | 'ar'; variant?: 'side' | 'bottom' }) {
  const hero = (L as any)[locale].hero.stories
  const items = hero.items as { quote: string; name: string; meta: string }[]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % items.length), 6000)
    return () => clearInterval(t)
  }, [items.length])
  const s = items[i]
  const quote = SHORT[s.name]?.[locale] ?? s.quote

  const card = (
    <figure key={i} className="intro-proof-card">
      <blockquote>“{quote}”</blockquote>
      <figcaption><strong>{s.name}</strong> · {s.meta}</figcaption>
    </figure>
  )

  if (variant === 'bottom') return <div className="intro-proof-bottom">{card}</div>

  return (
    <div className="intro-proof">
      <div className="intro-proof-head">
        <span className="intro-proof-logo"><Wordmark tone="dark" size={44} /></span>
        <p className="intro-proof-line">{ONE_LINER[locale]}</p>
      </div>
      <div className="intro-proof-quote">
        <p className="intro-proof-eyebrow">{hero.eyebrow}</p>
        {card}
      </div>
      <div className="intro-proof-worked">
        <p className="intro-proof-eyebrow">{locale === 'ar' ? 'مَن عملنا معهم' : "Who we've worked with"}</p>
        {/* moving bar: the list is shown twice and slides left by half its width, so it loops without a jump */}
        <div className="intro-proof-marquee" dir="ltr">
          <div className="intro-proof-track">
            {[0, 1].map(k => LOGOS.map(l => <Logo key={`${k}-${l.name}`} l={l} hidden={k === 1} />))}
          </div>
        </div>
      </div>
    </div>
  )
}
