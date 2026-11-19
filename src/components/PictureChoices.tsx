'use client'

// Picture cards for simple choice questions: tap a card instead of reading a paragraph.
// Same values in, same values out as the text version, only the look changes. Questions that are not listed in CARDS
// (abstract "which feels more like you" questions) keep their text cards. The full wording stays on each card as its
// accessible name, so a screen reader still hears the whole option.

import PictureArt from '@/components/PictureArt'

type Bi = { en: [string, string]; ar: [string, string] }   // [title, one short line]
type Card = { art: string } & Bi

const CARDS: Record<string, Record<string, Card>> = {
  // warm-up at the very start (not scored)
  QWARM: {
    solve:    { art: 'solve',    en: ['Solving problems', 'Figuring things out'],        ar: ['حلّ المشكلات', 'فهم الأمور وإيجاد الحلول'] },
    create:   { art: 'create',   en: ['Creating things', 'Ideas, design, art'],           ar: ['ابتكار الأشياء', 'أفكار وتصميم وفن'] },
    help:     { art: 'help',     en: ['Helping people', 'Teaching, caring, supporting'],  ar: ['مساعدة الناس', 'تعليم ورعاية ودعم'] },
    lead:     { art: 'lead',     en: ['Leading a team', 'Taking charge, deciding'],       ar: ['قيادة فريق', 'المبادرة واتخاذ القرار'] },
    build:    { art: 'build',    en: ['Building things', 'Hands-on, fixing, making'],     ar: ['بناء الأشياء', 'عمل يدوي وإصلاح وتصنيع'] },
    organise: { art: 'organise', en: ['Organising', 'Plans, order, detail'],              ar: ['التنظيم', 'خطط ونظام وتفاصيل'] },
  },
  // A = fast-changing, B = steady
  Q65: {
    A: { art: 'fast',   en: ['Fast-paced', 'Priorities shift, lots of improvising'], ar: ['سريع الإيقاع', 'أولويات متغيرة وكثير من الارتجال'] },
    B: { art: 'steady', en: ['Steady', 'Clear priorities, predictable rhythm'],     ar: ['منتظم', 'أولويات واضحة وإيقاع متوقع'] },
  },
  // A = large organisation, B = small and fast-moving
  Q66: {
    A: { art: 'big_org',    en: ['Big organisation', 'Clear structure, set processes'],  ar: ['منظمة كبيرة', 'هيكل واضح وعمليات محددة'] },
    B: { art: 'small_team', en: ['Small team', 'Fast-moving, shape how things work'],    ar: ['فريق صغير', 'مرن وتساهم في تشكيل العمل'] },
  },
  // A = government, B = private sector
  Q67: {
    A: { art: 'government', en: ['Government', 'Stable, national mission'],           ar: ['حكومي', 'استقرار ورسالة وطنية'] },
    B: { art: 'private',    en: ['Private sector', 'More variety, direct market'],    ar: ['قطاع خاص', 'تنوّع واحتكاك مباشر بالسوق'] },
  },
  QO7: {
    employee: { art: 'employee', en: ['Employee', 'Grow inside an organisation'],  ar: ['موظف', 'أنمو داخل منظمة'] },
    founder:  { art: 'founder',  en: ['Founder', 'Build my own business'],         ar: ['مؤسس', 'أبني مشروعي الخاص'] },
    blend:    { art: 'blend',    en: ['A blend', 'Stable role + a side project'],  ar: ['مزيج', 'وظيفة مستقرة + مشروع جانبي'] },
  },
}

export function hasPictures(qid: string): boolean {
  return qid in CARDS
}

export default function PictureChoices({
  qid, options, selected, multi = false, onPick, locale,
}: {
  qid: string
  options: { value: string; label: string }[]   // label = the full translated option text
  selected: string[]
  multi?: boolean
  onPick: (value: string) => void
  locale: string
}) {
  const lang = locale === 'ar' ? 'ar' : 'en'
  const set = CARDS[qid] ?? {}
  const withArt = options.filter(o => set[o.value])
  const extras = options.filter(o => !set[o.value])   // e.g. "Other" / "Not sure": plain chips under the cards
  const anyPicked = selected.length > 0

  return (
    <div className="pchoice">
      <div className={`pcards pcards-${withArt.length}`}>
        {withArt.map(o => {
          const c = set[o.value]
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              className={`pcard ${on ? 'sel' : ''} ${!multi && anyPicked && !on ? 'dim' : ''}`}
              aria-pressed={on}
              aria-label={o.label}
              onClick={() => onPick(o.value)}
            >
              <span className="pcard-art"><PictureArt name={c.art} /></span>
              <span className="pcard-title">{c[lang][0]}</span>
              <span className="pcard-sub">{c[lang][1]}</span>
              {multi && <span className="pcard-check" aria-hidden="true">{on ? '✓' : ''}</span>}
            </button>
          )
        })}
      </div>
      {extras.length > 0 && (
        <div className="pextras">
          {extras.map(o => {
            const on = selected.includes(o.value)
            return (
              <button key={o.value} type="button" className={`pextra ${on ? 'sel' : ''}`} aria-pressed={on} onClick={() => onPick(o.value)}>
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
