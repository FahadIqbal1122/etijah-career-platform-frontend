'use client'

import type { CSSProperties } from 'react'
import type { ReportTemplateData } from './types'
import { A, Arrow, Check, Lock, Logo, MASK, MONO, clampScore } from './parts'
import { Constellation, Hexagon } from './visuals'

// Template "Clarity" (option A of the report directions): light and calm, a progress meter, one big #1 match.
// withMap = "Clarity Plus": the same page with the career constellation in the hero (in place of the #1 match
// card, as in the Constellation template) and the interests hexagon added to the profile.
// Free plan: the careers the page gives it, the locked cards for the rest and for the plan. Paid: everything open.

const L = {
  en: {
    ready: 'YOUR CAREER PROFILE IS READY',
    thinkLike: 'You think like',
    sub: (n: number) => `Your answers show what drives you and how you like to work. We matched you to ${n} careers. Here is your best one.`,
    subPaid: (n: number) => `Your answers show what drives you and how you like to work. Here are your ${n} best career matches.`,
    riasec: 'RIASEC', topValue: 'TOP VALUE', topStrength: 'TOP STRENGTH',
    unlockMy: 'Unlock my full report', unlockFull: 'Unlock full report', seePreview: 'See your free preview',
    best: 'YOUR #1 CAREER MATCH', match: 'match', reveal: (n: number) => `Reveal all ${n} more matches`,
    viewing: (a: number, b: number) => `You are viewing ${a} of ${b} sections`,
    viewingSub: (r: number) => `Your free preview. The other ${r} are ready and waiting.`,
    free: 'FREE', yours: 'YOUR PROFILE', drives: 'What drives you',
    interests: 'Your interests', riasecProfile: 'RIASEC profile',
    values: 'What matters to you', strengths: 'What you are good at', pers: 'How you think and act',
    careersTitle: 'Careers that fit you',
    careersSub: 'We compared your personality, values and strengths with each career. The percentage shows how close the fit is.',
    careersTag: (n: number) => `02 · ${n} CAREERS`, careersTagFree: (a: number, b: number) => `02 · ${a} OF ${b} SHOWN`,
    rank1: (m: number) => `#1 · ${m}% MATCH`, strong: 'Strong fit',
    gap: 'GAP TO CLOSE', inFull: 'IN YOUR FULL REPORT',
    inFull1: ['3 next steps for this career', 'Internship, portfolio and a course to take'],
    inFull2: ['How AI will change this job', 'Tasks that are changing, skills that stay valuable'],
    inFull3: ['Courses picked for this career', 'Free and paid, with hours and level'],
    builds: 'Builds on your degree', newDir: 'A new direction',
    risk: (r: string) => `AI risk: ${r}`, lowRisk: 'Low AI risk',
    riskName: { low: 'Low', medium: 'Medium', high: 'High' } as Record<string, string>,
    seeAll: (n: number) => `See ${n} more careers, why they fit, and what to do next`, unlockNow: 'Unlock now',
    planTag: '03 · YOUR PLAN', planTitle: 'Start this week, finish in 90 days',
    planRows: [['DAYS 1-7', 'Your first step and the days after it'], ['WEEKS 2-4', 'Learning and people to join'], ['MONTHS 2-3', 'A finished project and a first application'], ['SKILLS', 'What to build and a practice exercise']],
    fullTitle: 'YOUR FULL CAREER REPORT', fullH: 'Everything we found for you, in one report.',
    fullItems: ['All career matches, explained', 'How AI will change each career', 'Your 90-day plan and worksheet', 'Courses and certificates for you', 'Job and internship listings', 'English and Arabic PDF', 'Job tracker for your applications'],
    fullCard: 'Full Career Report', secure: 'Secure checkout · Instant access',
    meter: ['Interests', 'Values and strengths', 'Personality', 'Your top careers', 'More careers', 'AI impact', '90-day plan', 'Courses and certificates', 'Job listings'],
    mapTag: (n: number) => `YOUR ${n} MATCHES`, mapTitle: 'Your career constellation', mapBest: 'best match', mapLowest: 'LOWEST AI RISK', mapLocked: (n: number) => `${n} more locked`,
  },
  ar: {
    ready: 'ملفك المهني جاهز',
    thinkLike: 'أنت من نمط',
    sub: (n: number) => `تُظهر إجاباتك ما يحركك وكيف تحب أن تعمل. طابقناك مع ${n} مسارات مهنية، وهذا أفضلها لك.`,
    subPaid: (n: number) => `تُظهر إجاباتك ما يحركك وكيف تحب أن تعمل. هذه أفضل ${n} مسارات مهنية تناسبك.`,
    riasec: 'RIASEC', topValue: 'أهم قيمة', topStrength: 'أبرز نقطة قوة',
    unlockMy: 'افتح تقريري الكامل', unlockFull: 'افتح التقرير الكامل', seePreview: 'شاهد المعاينة المجانية',
    best: 'أفضل مسار مهني لك', match: 'تطابق', reveal: (n: number) => `اكشف المسارات الـ${n} الأخرى`,
    viewing: (a: number, b: number) => `تشاهد ${a} من ${b} أقسام`,
    viewingSub: (r: number) => `هذه معاينتك المجانية. الأقسام الـ${r} الأخرى جاهزة بانتظارك.`,
    free: 'مجاني', yours: 'ملفك الشخصي', drives: 'ما يحركك',
    interests: 'اهتماماتك', riasecProfile: 'ملف RIASEC',
    values: 'ما يهمك', strengths: 'ما تجيده', pers: 'كيف تفكر وتتصرف',
    careersTitle: 'مسارات مهنية تناسبك',
    careersSub: 'قارنّا شخصيتك وقيمك ونقاط قوتك مع كل مسار مهني. تُظهر النسبة مدى قرب التوافق.',
    careersTag: (n: number) => `٠٢ · ${n} مسارات`, careersTagFree: (a: number, b: number) => `٠٢ · ${a} من ${b} ظاهرة`,
    rank1: (m: number) => `الأول · تطابق ${m}%`, strong: 'تطابق قوي',
    gap: 'الفجوة التي تحتاج سدّها', inFull: 'في تقريرك الكامل',
    inFull1: ['٣ خطوات تالية لهذا المسار', 'تدريب ومشروع وإحدى الدورات'],
    inFull2: ['كيف سيغيّر الذكاء الاصطناعي هذه المهنة', 'مهام تتغير ومهارات تبقى قيّمة'],
    inFull3: ['دورات مختارة لهذا المسار', 'مجانية ومدفوعة، مع الساعات والمستوى'],
    builds: 'يبني على دراستك', newDir: 'اتجاه جديد',
    risk: (r: string) => `أثر الذكاء الاصطناعي: ${r}`, lowRisk: 'أثر منخفض للذكاء الاصطناعي',
    riskName: { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' } as Record<string, string>,
    seeAll: (n: number) => `اطّلع على ${n} مسارات أخرى، ولماذا تناسبك، وما تفعله بعد ذلك`, unlockNow: 'افتح الآن',
    planTag: '٠٣ · خطتك', planTitle: 'ابدأ هذا الأسبوع وأنجز في ٩٠ يوماً',
    planRows: [['الأيام ١-٧', 'خطوتك الأولى وما بعدها'], ['الأسابيع ٢-٤', 'تعلّم وأشخاص تنضم إليهم'], ['الشهران ٢-٣', 'مشروع مكتمل وأول طلب توظيف'], ['المهارات', 'ما تبنيه وتمرين تطبيقي']],
    fullTitle: 'تقريرك المهني الكامل', fullH: 'كل ما وجدناه لك، في تقرير واحد.',
    fullItems: ['جميع المسارات المهنية مشروحة', 'كيف سيغيّر الذكاء الاصطناعي كل مسار', 'خطة ٩٠ يوماً وورقة العمل', 'دورات وشهادات مناسبة لك', 'فرص العمل والتدريب', 'تقرير PDF بالإنجليزية والعربية', 'متابع لطلبات التوظيف'],
    fullCard: 'التقرير المهني الكامل', secure: 'دفع آمن · وصول فوري',
    meter: ['الاهتمامات', 'القيم ونقاط القوة', 'الشخصية', 'أفضل مساراتك', 'مسارات أخرى', 'أثر الذكاء الاصطناعي', 'خطة ٩٠ يوماً', 'الدورات والشهادات', 'فرص العمل'],
    mapTag: (n: number) => `مساراتك الـ${n}`, mapTitle: 'كوكبة مساراتك المهنية', mapBest: 'الأفضل', mapLowest: 'الأقل تأثراً بالذكاء الاصطناعي', mapLocked: (n: number) => `${n} مسارات أخرى مقفلة`,
  },
}

const card: CSSProperties = { background: '#ffffff', border: '1px solid rgba(7,112,186,0.14)', borderRadius: 20 }
const section: CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '48px 24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }

export default function ClarityTemplate({ data, withMap = false }: { data: ReportTemplateData; withMap?: boolean }) {
  const ar = data.locale === 'ar'
  const c = L[ar ? 'ar' : 'en']
  const paid = data.paid
  const ls = (v: string) => (ar ? '0' : v)
  const eyebrow: CSSProperties = { fontFamily: ar ? undefined : MONO, fontSize: 13, letterSpacing: ls('0.14em'), color: '#0b5c99', fontWeight: 500 }
  const p = data.preview
  const [top, ...rest] = data.careers
  const n = data.careers.length
  const totalCareers = n + data.lockedMore
  const riasecSorted = [...data.riasec].sort((a, b) => b.score - a.score)
  const vowel = /^[aeiou]/i.test(data.topTypeLabel)
  const heroTitle = ar
    ? <>{c.thinkLike} <span style={{ color: '#0770ba' }}>{data.topTypeLabel}.</span></>
    : <>{c.thinkLike} {vowel ? 'an' : 'a'} <span style={{ color: '#0770ba' }}>{data.topTypeLabel}.</span></>
  const dl = data.download

  const pill = (text: string, bg: string, fg: string) => (
    <span style={{ fontSize: 13, fontWeight: 700, color: fg, background: bg, borderRadius: 999, padding: '4px 10px' }}>{text}</span>
  )
  const riskPill = (r?: string) => r
    ? (r === 'low' ? pill(c.lowRisk, '#e2f6f0', '#0a705a') : pill(c.risk(c.riskName[r] || r), r === 'high' ? '#fde4e1' : '#fff1d1', r === 'high' ? '#a1261a' : '#8a5300'))
    : null
  const dirPill = (d?: string, bg = '#e2f6f0', fg = '#0a705a') => d ? pill(d === 'new_direction' ? c.newDir : c.builds, bg, fg) : null

  const topBtn = paid
    ? <button type="button" onClick={dl.onDownload} disabled={dl.busy} style={{ border: 0, cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0770ba', color: '#fff', fontWeight: 800, fontSize: 15, padding: '11px 18px', borderRadius: 12, opacity: dl.busy ? 0.6 : 1 }}>{dl.busy ? dl.busyLabel : dl.label}</button>
    : <A href="#rt-unlock" preview={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00c9a7', color: '#04323f', fontWeight: 800, fontSize: 15, padding: '11px 18px', borderRadius: 12, minHeight: 44, boxSizing: 'border-box' }}><Lock size={16} />{c.unlockFull}</A>

  // sections the free plan has not opened yet (the progress meter)
  const freeCount = 4
  const meter = c.meter

  return (
    <div dir={ar ? 'rtl' : 'ltr'} style={{ containerType: 'inline-size', fontFamily: 'inherit', color: '#414142', background: '#ffffff' }}>
      <header style={{ borderBottom: '1px solid rgba(7,112,186,0.12)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#075288', fontWeight: 800, fontSize: 20 }}><Logo size={28} />{ar ? 'اتجاهي' : 'Etijahi'}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {paid && dl.altLabel && <button type="button" onClick={dl.onAlt} disabled={dl.busy} style={{ cursor: 'pointer', font: 'inherit', background: '#fff', color: '#075288', border: '1px solid rgba(7,112,186,0.24)', fontWeight: 700, fontSize: 14, padding: '10px 14px', borderRadius: 12 }}>{dl.altLabel}</button>}
            {topBtn}
          </span>
        </div>
        {dl.error && <p style={{ margin: 0, textAlign: 'center', color: '#be123c', fontSize: 13, paddingBottom: 8 }}>{dl.error}</p>}
      </header>

      {/* hero */}
      <section style={{ background: '#f4f9ff', borderBottom: '1px solid rgba(7,112,186,0.12)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 64px', display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center' }}>
          <div style={{ flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...eyebrow, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c9a7', display: 'inline-block' }} />{c.ready}
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(32px, 7cqw, 60px)', lineHeight: 1.08, fontWeight: 800, color: '#1f2a37' }}>{heroTitle}</h1>
            <p style={{ margin: 0, fontSize: 'clamp(16px, 2.4cqw, 20px)', lineHeight: 1.6, color: '#4d5056', maxWidth: 560 }}>{paid ? c.subPaid(n) : c.sub(totalCareers)}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[[c.riasec, data.riasecCode], [c.topValue, data.values[0]?.label], [c.topStrength, data.strengths[0]?.label]].filter(x => x[1]).map(([k, v]) => (
                <span key={k} style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline', background: '#fff', border: '1px solid rgba(7,112,186,0.18)', borderRadius: 999, padding: '9px 16px', fontSize: 15 }}>
                  <span style={{ fontFamily: ar ? undefined : MONO, fontSize: 12, color: '#5c6068' }}>{k}</span><strong style={{ color: '#075288' }}>{v}</strong>
                </span>
              ))}
            </div>
            {!paid && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', paddingTop: 6 }}>
                <A href="#rt-unlock" preview={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0770ba', color: '#fff', fontWeight: 800, fontSize: 18, padding: '16px 26px', borderRadius: 14, boxShadow: '0 10px 24px rgba(7,112,186,0.28)' }}>{c.unlockMy}<Arrow flip={ar} /></A>
                <A href="#rt-preview" preview={p} style={{ fontWeight: 700, fontSize: 16, padding: '14px 10px', color: '#075288' }}>{c.seePreview}</A>
              </div>
            )}
          </div>

          {top && withMap && (
            <div style={{ flex: '1 1 380px', minWidth: 0, maxWidth: 560, background: '#fff', border: '1px solid rgba(7,112,186,0.16)', borderRadius: 22, boxShadow: '0 24px 60px rgba(7,82,136,0.14)', padding: 'clamp(12px, 3cqw, 24px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: ar ? undefined : MONO, fontSize: 12, letterSpacing: ls('0.14em'), color: '#0a705a', fontWeight: 600 }}>{c.mapTag(totalCareers)}</div>
              <Constellation data={data} unlockedLabel={c.mapBest} lowestLabel={c.mapLowest} lockedLabel={c.mapLocked(data.lockedMore)} tone="light" />
              {data.lockedMore > 0 && (
                <A href="#rt-unlock" preview={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ebf3ff', color: '#075288', fontWeight: 800, borderRadius: 12, padding: 13, minHeight: 44, boxSizing: 'border-box' }}>{c.reveal(data.lockedMore)}</A>
              )}
            </div>
          )}
          {top && !withMap && (
            <div style={{ flex: '1 1 340px', minWidth: 0, maxWidth: 460, position: 'relative', paddingBottom: data.lockedMore > 0 ? 28 : 0 }}>
              {data.lockedMore > 0 && <>
                <div style={{ position: 'absolute', left: 28, right: 28, bottom: 0, height: 60, background: '#fff', border: '1px solid rgba(7,112,186,0.12)', borderRadius: 20, opacity: 0.6 }} />
                <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, height: 60, background: '#fff', border: '1px solid rgba(7,112,186,0.14)', borderRadius: 20, opacity: 0.85 }} />
              </>}
              <div style={{ position: 'relative', background: '#fff', border: '1px solid rgba(7,112,186,0.16)', borderRadius: 22, boxShadow: '0 24px 60px rgba(7,82,136,0.14)', padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ fontFamily: ar ? undefined : MONO, fontSize: 12, letterSpacing: ls('0.14em'), color: '#0a705a', fontWeight: 600 }}>{c.best}</div>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <Ring value={clampScore(top.match)} label={c.match} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#1f2a37', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{top.title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{dirPill(top.direction)}{riskPill(top.risk)}</div>
                  </div>
                </div>
                {rest.length > 0 && (
                  <div style={{ borderTop: '1px dashed rgba(7,112,186,0.2)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rest.slice(0, 3).map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontWeight: 700, color: '#1f2a37', overflowWrap: 'anywhere' }}>{r.title}</span>
                        <span style={{ fontWeight: 800, color: '#075288' }}>{clampScore(r.match)}%</span>
                      </div>
                    ))}
                    {data.lockedMore > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span aria-hidden="true" style={{ filter: 'blur(6px)', fontWeight: 700, color: '#1f2a37', userSelect: 'none' }}>{MASK}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#075288' }}><Lock size={14} /></span>
                      </div>
                    )}
                  </div>
                )}
                {data.lockedMore > 0 && (
                  <A href="#rt-unlock" preview={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ebf3ff', color: '#075288', fontWeight: 800, borderRadius: 12, padding: 13, minHeight: 44, boxSizing: 'border-box' }}>{c.reveal(data.lockedMore)}</A>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* progress meter (free plan) */}
      {!paid && (
        <section id="rt-preview" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 8px' }}>
          <div style={{ ...card, padding: '22px 26px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2a37' }}>{c.viewing(freeCount, meter.length)}</div>
              <div style={{ fontSize: 16, color: '#5c6068' }}>{c.viewingSub(meter.length - freeCount)}</div>
            </div>
            <div style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${meter.length}, minmax(0, 1fr))`, gap: 6 }}>
                {meter.map((_, i) => <span key={i} style={{ height: 10, borderRadius: 6, background: i < freeCount ? '#00c9a7' : '#dfe9f5' }} />)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 14, fontWeight: 700 }}>
                {meter.map((m, i) => <span key={i} style={i < freeCount ? { color: '#0a705a', background: '#e2f6f0', borderRadius: 8, padding: '5px 10px' } : { color: '#545968', background: '#eceef2', borderRadius: 8, padding: '5px 10px' }}>{m}</span>)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* profile */}
      <section style={section}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={eyebrow}>01 · {paid ? c.yours : c.free}</div>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 5cqw, 40px)', fontWeight: 800, color: '#1f2a37' }}>{c.drives}</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ ...card, flex: '3 1 440px', minWidth: 0, padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2a37' }}>{c.interests}</h3>
              <span style={{ fontSize: 14, color: '#5c6068' }}>{c.riasecProfile}</span>
            </div>
            {withMap && <div style={{ display: 'flex', justifyContent: 'center' }}><Hexagon data={data} /></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {riasecSorted.map((r, i) => (
                <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 140px) minmax(0, 1fr) 44px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: i < 2 ? 800 : 700, color: i < 2 ? '#1f2a37' : undefined }}>{r.label}</span>
                  <span style={{ height: 14, background: '#ebf3ff', borderRadius: 8, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${clampScore(r.score)}%`, background: i < 2 ? '#0770ba' : '#9cc7e8', borderRadius: 8 }} />
                  </span>
                  <span style={{ fontFamily: MONO, fontWeight: 600, color: i < 2 ? '#075288' : '#545968', textAlign: ar ? 'left' : 'right' }}>{clampScore(r.score)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: '2 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[[c.values, data.values], [c.strengths, data.strengths]].map(([title, rows]) => (
              <div key={title as string} style={{ ...card, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1f2a37' }}>{title as string}</h3>
                {(rows as ReportTemplateData['values']).map((r, i, arr) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: i < arr.length - 1 ? '1px solid #eef3f9' : undefined, paddingBottom: i < arr.length - 1 ? 10 : 0 }}>
                    <span style={{ fontWeight: 700 }}>{r.label}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 600, color: '#075288' }}>{clampScore(r.score)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {data.personality && data.personality.length > 0 && (
          <div style={{ ...card, padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1f2a37' }}>{c.pers}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              {data.personality.map(t => (
                <div key={t.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontWeight: 800 }}>{t.label}</span>
                  <span style={{ height: 10, background: '#ebf3ff', borderRadius: 6 }}><span style={{ display: 'block', height: '100%', width: `${clampScore(t.score)}%`, background: '#0770ba', borderRadius: 6 }} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* careers */}
      {top && (
        <section style={section}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={eyebrow}>{paid ? c.careersTag(n) : c.careersTagFree(n, totalCareers)}</div>
            <h2 style={{ margin: 0, fontSize: 'clamp(26px, 5cqw, 40px)', fontWeight: 800, color: '#1f2a37' }}>{c.careersTitle}</h2>
            <p style={{ margin: 0, fontSize: 17, color: '#4d5056', maxWidth: 720 }}>{c.careersSub}</p>
          </div>

          <div style={{ background: '#fff', border: '2px solid #00c9a7', borderRadius: 24, padding: 28, display: 'flex', flexWrap: 'wrap', gap: 28 }}>
            <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: ar ? undefined : MONO, fontSize: 13, fontWeight: 600, color: '#04323f', background: '#00c9a7', borderRadius: 8, padding: '5px 10px' }}>{c.rank1(clampScore(top.match))}</span>
                {top.match >= 80 && <span style={{ fontSize: 14, fontWeight: 700, color: '#0a705a' }}>{c.strong}</span>}
              </div>
              <h3 style={{ margin: 0, fontSize: 'clamp(24px, 4.5cqw, 34px)', fontWeight: 800, color: '#1f2a37', overflowWrap: 'anywhere' }}>{top.title}</h3>
              {top.summary && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: '#4d5056' }}>{top.summary}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{dirPill(top.direction)}{riskPill(top.risk)}</div>
              {top.gap && (
                <div style={{ background: '#fff8e8', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: ar ? undefined : MONO, fontSize: 12, letterSpacing: ls('0.12em'), color: '#8a5300', fontWeight: 600 }}>{c.gap}</span>
                  <span style={{ fontSize: 16, lineHeight: 1.55 }}>{top.gap}</span>
                </div>
              )}
            </div>
            {!paid && (
              <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: ar ? undefined : MONO, fontSize: 12, letterSpacing: ls('0.12em'), color: '#5c6068', fontWeight: 600 }}>{c.inFull}</div>
                {[c.inFull1, c.inFull2, c.inFull3].map(([a, b]) => (
                  <div key={a} style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#f6f8fb', borderRadius: 14, padding: '14px 16px' }}>
                    <span style={{ color: '#5c6068' }}><Lock size={18} /></span>
                    <span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ color: '#1f2a37' }}>{a}</strong><span style={{ fontSize: 14, color: '#5c6068' }}>{b}</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(rest.length > 0 || data.lockedMore > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {rest.map((r, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid rgba(7,112,186,0.16)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#075288' }}>{clampScore(r.match)}%</span>
                  <span style={{ fontSize: 19, fontWeight: 800, color: '#1f2a37', overflowWrap: 'anywhere' }}>{r.title}</span>
                  {(r.direction || r.risk) && <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{dirPill(r.direction, '#e6f1fa', '#0b5c99')}{riskPill(r.risk)}</span>}
                  {r.summary && <span style={{ fontSize: 15, lineHeight: 1.55, color: '#4d5056' }}>{r.summary}</span>}
                </div>
              ))}
              {data.lockedMore > 0 && (
                <A href="#rt-unlock" preview={p} style={{ background: '#075288', color: '#fff', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.3 }}>{data.locked.moreTitle}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.5, color: '#d6e6f4' }}>{data.locked.moreBody}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#00c9a7' }}>{c.unlockNow}<Arrow flip={ar} /></span>
                </A>
              )}
            </div>
          )}
        </section>
      )}

      {/* plan (free plan: locked, as in the default report there is no plan at all) */}
      {!paid && (
        <section style={section}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={eyebrow}>{c.planTag}</div>
            <h2 style={{ margin: 0, fontSize: 'clamp(26px, 5cqw, 40px)', fontWeight: 800, color: '#1f2a37' }}>{c.planTitle}</h2>
          </div>
          <div style={{ ...card, borderRadius: 22, padding: 26, position: 'relative', overflow: 'hidden' }}>
            {c.planRows.map(([when, what], i, arr) => (
              <div key={when} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 120px) minmax(0, 1fr)', gap: 16, padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #eef3f9' : undefined }}>
                <span style={{ fontFamily: ar ? undefined : MONO, fontSize: 13, color: '#0b5c99', fontWeight: 600 }}>{when}</span>
                <span aria-hidden="true" style={{ filter: 'blur(5px)', userSelect: 'none' }}>{what}</span>
              </div>
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.78)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 12, background: '#075288', color: '#fff', alignItems: 'center', justifyContent: 'center' }}><Lock size={18} /></span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#1f2a37' }}>{data.locked.planTitle}</span>
              <span style={{ fontSize: 15, color: '#4d5056', maxWidth: 520 }}>{data.locked.planBody}</span>
              <A href="#rt-unlock" preview={p} style={{ fontWeight: 800, color: '#075288' }}>{data.locked.planCta}</A>
            </div>
          </div>
        </section>
      )}

      {/* unlock panel (free plan) */}
      {!paid && (
        <section id="rt-unlock" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 40px' }}>
          <div style={{ background: '#075288', borderRadius: 28, padding: 'clamp(24px, 5cqw, 48px)', display: 'flex', flexWrap: 'wrap', gap: 36, alignItems: 'center' }}>
            <div style={{ flex: '1.3 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontFamily: ar ? undefined : MONO, fontSize: 13, letterSpacing: ls('0.14em'), color: '#8fd8c3' }}>{c.fullTitle}</div>
              <h2 style={{ margin: 0, fontSize: 'clamp(26px, 5cqw, 42px)', lineHeight: 1.12, fontWeight: 800, color: '#fff' }}>{c.fullH}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px 24px', color: '#e6f1fa', fontSize: 16 }}>
                {c.fullItems.map(t => <span key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><span style={{ color: '#00c9a7' }}><Check /></span>{t}</span>)}
              </div>
            </div>
            <div style={{ flex: '1 1 280px', minWidth: 0, maxWidth: 400, background: '#fff', borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#1f2a37' }}>{c.fullCard}</div>
              <A href={data.unlockHref} preview={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#00c9a7', color: '#04323f', fontWeight: 800, fontSize: 18, padding: 16, borderRadius: 14, minHeight: 52, boxSizing: 'border-box' }}>{data.locked.planCta}</A>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, color: '#5c6068' }}><Lock size={14} />{c.secure}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 52, circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 116, height: 116, flex: '0 0 116px' }}>
      <svg viewBox="0 0 120 120" width="116" height="116" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e6eef7" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#00c9a7" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(circ * value) / 100} ${circ}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: '#1f2a37', lineHeight: 1 }}>{value}%</span>
        <span style={{ fontSize: 13, color: '#5c6068' }}>{label}</span>
      </div>
    </div>
  )
}
