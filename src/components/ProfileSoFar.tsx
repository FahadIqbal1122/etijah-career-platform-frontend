'use client'

// "Your profile so far": a short pause before the pay gate. Four cards built only from what is answered by then
// (interests + personality). Strengths and work style are early reads from the Big Five; the full scoring comes after.

import { computeRanked } from '@/data/revealScoring'

type L = { en: string; ar: string }

const STRENGTH: Record<string, { name: L; line: L }> = {
  openness:          { name: { en: 'Fast learner', ar: 'سريع التعلّم' }, line: { en: 'You pick up new skills quickly and keep improving.', ar: 'تلتقط المهارات الجديدة بسرعة وتواصل التحسّن.' } },
  conscientiousness: { name: { en: 'Finisher', ar: 'تُنجز ما تبدأ' }, line: { en: 'You plan ahead and turn plans into finished work.', ar: 'تخطّط مسبقاً وتحوّل الخطط إلى عمل مكتمل.' } },
  extraversion:      { name: { en: 'Natural communicator', ar: 'متواصل بالفطرة' }, line: { en: 'You get ideas across and bring people with you.', ar: 'توصل أفكارك وتأخذ الناس معك.' } },
  agreeableness:     { name: { en: 'Team builder', ar: 'بنّاء للفريق' }, line: { en: 'You build trust and help groups work well together.', ar: 'تبني الثقة وتساعد الفريق على العمل معاً.' } },
  stability:         { name: { en: 'Steady under pressure', ar: 'ثابت تحت الضغط' }, line: { en: 'You keep a clear head when things get stressful.', ar: 'تحافظ على وضوح تفكيرك عند الضغط.' } },
}

const WORK_STYLE: Record<string, { name: L; thrives: L; grows: L }> = {
  extraversion: {
    name: { en: 'Team-energised', ar: 'يستمد طاقته من الفريق' },
    thrives: { en: 'busy, social teams with lots of back and forth.', ar: 'فرق نشطة اجتماعية وتواصل مستمر.' },
    grows: { en: 'a mentor who talks things through often.', ar: 'مرشد يتحاور معك باستمرار.' },
  },
  conscientiousness: {
    name: { en: 'Structured achiever', ar: 'منجز منظّم' },
    thrives: { en: 'clear goals, clear deadlines, a plan to follow.', ar: 'أهداف واضحة ومواعيد محددة وخطة تتبعها.' },
    grows: { en: 'a manager who sets clear expectations and reviews progress.', ar: 'مدير يضع توقعات واضحة ويراجع التقدّم.' },
  },
  openness: {
    name: { en: 'Independent explorer', ar: 'مستكشف مستقل' },
    thrives: { en: 'freedom in how to reach a goal, and room to try new ideas.', ar: 'حرية في اختيار الطريق ومساحة لتجربة أفكار جديدة.' },
    grows: { en: 'a mentor who challenges your ideas and gives you space.', ar: 'مرشد يتحدّى أفكارك ويمنحك مساحة.' },
  },
  agreeableness: {
    name: { en: 'Supportive collaborator', ar: 'متعاون داعم' },
    thrives: { en: 'warm, cooperative teams where people look out for each other.', ar: 'فرق متعاونة ودودة يسند أفرادها بعضهم.' },
    grows: { en: 'a supportive manager who listens and gives regular feedback.', ar: 'مدير داعم يُصغي ويعطيك ملاحظات منتظمة.' },
  },
}
const WS_KEYS = ['extraversion', 'conscientiousness', 'openness', 'agreeableness']

const STR = {
  en: {
    kicker: 'Your profile so far', head: (n: string) => n ? `Here is what we learned about you, ${n}` : 'Here is what we learned about you',
    sub: 'Based on your answers so far', interests: 'Top interests', personality: 'Personality', strength: 'Strength', workStyle: 'Work style',
    early: 'Early read', thrives: 'Thrives in:', grows: 'Grows with:',
    cta: 'Complete your journey to unlock your full career path', btn: 'Continue',
  },
  ar: {
    kicker: 'ملفك حتى الآن', head: (n: string) => n ? `هذا ما عرفناه عنك يا ${n}` : 'هذا ما عرفناه عنك',
    sub: 'بناءً على إجاباتك حتى الآن', interests: 'أبرز ميولك', personality: 'الشخصية', strength: 'نقطة قوة', workStyle: 'أسلوب العمل',
    early: 'قراءة أولية', thrives: 'تزدهر في:', grows: 'تنمو مع:',
    cta: 'أكمل رحلتك لتفتح مسارك المهني الكامل', btn: 'متابعة',
  },
} as const

export default function ProfileSoFar({ locale, name, answers, interestNames, personality, onContinue }: {
  locale: string
  name: string
  answers: Record<string, unknown>
  interestNames: string[]                      // top 2 interest names, already translated
  personality: [string, string] | null         // [name, line] of the strongest Big Five trait
  onContinue: () => void
}) {
  const lang = locale === 'ar' ? 'ar' : 'en'
  const s = STR[lang]
  const traits = computeRanked(answers, 'big_five')
  const strengthKey = traits[1]?.dimension ?? traits[0]?.dimension          // 2nd trait, so it differs from the personality card
  const strength = strengthKey ? STRENGTH[strengthKey] : null
  const wsKey = traits.find(t => WS_KEYS.includes(t.dimension))?.dimension
  const ws = wsKey ? WORK_STYLE[wsKey] : null

  const card = 'rounded-2xl bg-white border border-[var(--line)] p-4 shadow-sm'
  const label = 'text-[11px] font-semibold uppercase tracking-wider text-primary'

  return (
    <div className="fixed inset-0 z-50 brand-surface overflow-y-auto overscroll-contain" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      <div className="min-h-full flex items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">{s.kicker}</p>
          <h2 className="mt-2 text-center text-2xl font-extrabold text-charcoal">{s.head(name)}</h2>
          <p className="mt-1 text-center text-sm text-charcoal/60">{s.sub}</p>

          <div className="mt-6 grid gap-3">
            {interestNames.length > 0 && (
              <div className={card}>
                <p className={label}>{s.interests}</p>
                <p className="mt-1 text-lg font-extrabold text-charcoal">{interestNames.join(' · ')}</p>
              </div>
            )}
            {personality && (
              <div className={card}>
                <p className={label}>{s.personality}</p>
                <p className="mt-1 text-lg font-extrabold text-charcoal">{personality[0]}</p>
                <p className="text-sm text-charcoal/70">{personality[1]}</p>
              </div>
            )}
            {strength && (
              <div className={card}>
                <p className={label}>{s.strength} <span className="ms-1 normal-case tracking-normal font-medium text-charcoal/50">· {s.early}</span></p>
                <p className="mt-1 text-lg font-extrabold text-charcoal">{strength.name[lang]}</p>
                <p className="text-sm text-charcoal/70">{strength.line[lang]}</p>
              </div>
            )}
            {ws && (
              <div className="rounded-2xl border border-teal/50 bg-[#E8FAF6] p-4 shadow-sm">
                <p className={label}>{s.workStyle} <span className="ms-1 normal-case tracking-normal font-medium text-charcoal/50">· {s.early}</span></p>
                <p className="mt-1 text-lg font-extrabold text-charcoal">{ws.name[lang]}</p>
                <p className="mt-1 text-sm text-charcoal/80"><b>{s.thrives}</b> {ws.thrives[lang]}</p>
                <p className="mt-1 text-sm text-charcoal/80"><b>{s.grows}</b> {ws.grows[lang]}</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-base font-bold text-charcoal">{s.cta}</p>
          <button type="button" onClick={onContinue} data-track="profile_so_far_continue"
            className="mt-3 w-full min-h-[48px] rounded-xl bg-primary text-white text-sm font-semibold">{s.btn}</button>
        </div>
      </div>
    </div>
  )
}
