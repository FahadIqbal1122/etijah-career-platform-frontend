'use client'

import type { CSSProperties } from 'react'
import type { ReportTemplateData } from './types'
import { A, Arrow, Check, Lock, MONO, clampScore } from './parts'
import { Constellation, Hexagon } from './visuals'

// Template "Constellation" (option B of the report directions): dark and premium. Every career is a star on a
// rising line, the best one lit. Free plan: the careers the page gives it, the locked cards for the rest and for
// the plan, plus the chapter list and the Free vs Full table. Paid: everything open.

const L = {
  en: {
    eyebrow: (code: string) => `CAREER ASSESSMENT · ${code}`,
    h1a: 'Careers fit you.', h1aPaid: (n: number) => `${n} careers fit you.`, h1b: 'We lit up your best one.', h1bPaid: 'Here they all are.',
    sub: (type: string) => `Your answers point to the ${type} type. Your brightest match is `,
    careersMatched: 'careers shown', topMatch: 'top match', plan: 'day plan',
    unlockAll: 'Unlock all careers', preview: 'Explore free preview', getFull: 'Get full report',
    mapBest: 'best match', mapLowest: 'LOWEST AI RISK', mapLocked: 'More careers in your full report',
    freeProfile: 'FREE · YOUR PROFILE', yourProfile: 'YOUR PROFILE', who: 'Who you are at work',
    careerType: 'CAREER TYPE', topValue: 'TOP VALUE', topStrength: 'TOP STRENGTH',
    interests: 'Your interests', valuesStrengths: 'Values and strengths', persTitle: 'How you think and act',
    matchesFree: (n: number) => `YOUR TOP ${n} MATCHES`, matchesPaid: (n: number) => `YOUR ${n} MATCHES`,
    careersTitle: 'Careers that fit you',
    matchOf: 'MATCH · #1',
    riskLabel: (r: string) => `AI risk: ${r}`, gapLabel: (g: string) => `Gap: ${g}`,
    unlockFor: 'UNLOCK FOR THIS CAREER',
    unl1: ['3 next steps', 'Internship · Portfolio · Course'], unl2: ['AI impact deep dive', 'Global and local view'], unl3: ['Courses for this career', 'Free and paid, with level'],
    th: ['#', 'CAREER', 'FIT', 'AI RISK', 'DETAILS'], locked: 'Locked',
    risk: { low: 'Low', medium: 'Medium', high: 'High' } as Record<string, string>,
    inside: 'WHAT IS INSIDE', insideH: 'Your full report, chapter by chapter',
    insideP: 'Every chapter is already written for you, based on your answers. Unlocking just opens it.',
    chapters: [
      ['All careers, in depth', 'Why each fits you, the gap to close and your next 3 steps.'],
      ['How AI will change each career', 'Tasks that are changing, and the human skills that stay valuable.'],
      ['Your 90-day plan', 'A first step you can take this week, then a roadmap and a worksheet.'],
      ['Courses and certificates', 'Picks matched to your strengths and the careers you are aiming for.'],
      ['Job and internship listings', 'Current openings that match your best careers, with a job tracker.'],
      ['Your PDF report', 'Your full report in English and Arabic.'],
    ],
    compare: 'Compare', free: 'Free', fullR: 'Full report',
    rows: [['Interests, values and strengths', 1], ['Your top careers', 1], ['More careers, in depth', 'Locked'], ['AI impact for every career', 'Locked'], ['90-day plan and worksheet', 'Locked'], ['Courses, certificates, listings', 'Locked'], ['PDF in English and Arabic', 'Locked']] as [string, string | number][],
    passTag: 'FULL CAREER REPORT', passH: 'Light up all your careers',
    pass1: 'Instant access, yours to keep', pass2: 'Secure checkout',
  },
  ar: {
    eyebrow: (code: string) => `التقييم المهني · ${code}`,
    h1a: 'مسارات مهنية تناسبك.', h1aPaid: (n: number) => `${n} مسارات مهنية تناسبك.`, h1b: 'أضأنا لك أفضلها.', h1bPaid: 'ها هي كلها أمامك.',
    sub: (type: string) => `تشير إجاباتك إلى نمط ${type}. وأقوى مساراتك تطابقاً هو `,
    careersMatched: 'مسارات ظاهرة', topMatch: 'أعلى تطابق', plan: 'يوماً لخطتك',
    unlockAll: 'افتح كل المسارات', preview: 'استكشف المعاينة المجانية', getFull: 'احصل على التقرير الكامل',
    mapBest: 'الأفضل', mapLowest: 'الأقل تأثراً بالذكاء الاصطناعي', mapLocked: 'مسارات أخرى في تقريرك الكامل',
    freeProfile: 'مجاني · ملفك الشخصي', yourProfile: 'ملفك الشخصي', who: 'من أنت في العمل',
    careerType: 'نمط المسار', topValue: 'أهم قيمة', topStrength: 'أبرز نقطة قوة',
    interests: 'اهتماماتك', valuesStrengths: 'القيم ونقاط القوة', persTitle: 'كيف تفكر وتتصرف',
    matchesFree: (n: number) => `أفضل ${n} مسارات لك`, matchesPaid: (n: number) => `مساراتك الـ${n}`,
    careersTitle: 'مسارات مهنية تناسبك',
    matchOf: 'تطابق · الأول',
    riskLabel: (r: string) => `أثر الذكاء الاصطناعي: ${r}`, gapLabel: (g: string) => `الفجوة: ${g}`,
    unlockFor: 'افتح لهذا المسار',
    unl1: ['٣ خطوات تالية', 'تدريب · مشروع · دورة'], unl2: ['تحليل أثر الذكاء الاصطناعي', 'نظرة عالمية ومحلية'], unl3: ['دورات لهذا المسار', 'مجانية ومدفوعة، مع المستوى'],
    th: ['#', 'المسار', 'التوافق', 'أثر الذكاء الاصطناعي', 'التفاصيل'], locked: 'مقفل',
    risk: { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' } as Record<string, string>,
    inside: 'ما بداخله', insideH: 'تقريرك الكامل، فصلاً بعد فصل',
    insideP: 'كل فصل مكتوب لك مسبقاً بناءً على إجاباتك. الفتح يجعله متاحاً فقط.',
    chapters: [
      ['جميع المسارات بالتفصيل', 'لماذا يناسبك كل مسار، والفجوة التي تحتاج سدّها، وخطواتك الثلاث التالية.'],
      ['كيف سيغيّر الذكاء الاصطناعي كل مسار', 'مهام تتغير، ومهارات إنسانية تبقى قيّمة.'],
      ['خطتك لـ٩٠ يوماً', 'خطوة أولى يمكنك تنفيذها هذا الأسبوع، ثم خارطة طريق وورقة عمل.'],
      ['الدورات والشهادات', 'اختيارات مطابقة لنقاط قوتك والمسارات التي تستهدفها.'],
      ['فرص العمل والتدريب', 'فرص حالية تطابق أفضل مساراتك، مع متابع للطلبات.'],
      ['تقرير PDF', 'تقريرك الكامل بالإنجليزية والعربية.'],
    ],
    compare: 'المقارنة', free: 'مجاني', fullR: 'التقرير الكامل',
    rows: [['الاهتمامات والقيم ونقاط القوة', 1], ['أفضل مساراتك', 1], ['مسارات أخرى بالتفصيل', 'مقفل'], ['أثر الذكاء الاصطناعي لكل مسار', 'مقفل'], ['خطة ٩٠ يوماً وورقة العمل', 'مقفل'], ['الدورات والشهادات والفرص', 'مقفل'], ['PDF بالإنجليزية والعربية', 'مقفل']] as [string, string | number][],
    passTag: 'التقرير المهني الكامل', passH: 'أضئ كل مساراتك',
    pass1: 'وصول فوري، ملكك للأبد', pass2: 'دفع آمن',
  },
}

const outline: CSSProperties = { border: '1px solid rgba(7,112,186,0.14)', borderRadius: 22 }
const wrap: CSSProperties = { maxWidth: 1560, margin: '0 auto', padding: '56px 24px 16px', display: 'flex', flexDirection: 'column', gap: 28 }

export default function ConstellationTemplate({ data }: { data: ReportTemplateData }) {
  const ar = data.locale === 'ar'
  const c = L[ar ? 'ar' : 'en']
  const paid = data.paid
  const p = data.preview
  const ls = (v: string) => (ar ? '0' : v)
  const mono = ar ? undefined : MONO
  // the page's order is kept; the best card is the first career not marked "not for me"
  const topIndex = Math.max(0, data.careers.findIndex(x => !x.rejected))
  const top = data.careers[topIndex]
  const rest = data.careers.filter((_, i) => i !== topIndex)
  const n = data.careers.length
  const hasScores = data.riasec.length > 0 && data.riasec.every(r => typeof r.score === 'number')
  const fitText = (f?: string) => (f === 'strong_fit' ? data.labels.strong_fit : f === 'worth_exploring' ? data.labels.worth_exploring : '')
  const dl = data.download
  const eyebrow = (color: string): CSSProperties => ({ fontFamily: mono, fontSize: 13, letterSpacing: ls('0.16em'), color, fontWeight: 600 })
  const tag = (d?: 'builds_on_background' | 'new_direction') => (d ? data.labels[d] : '')

  return (
    <div dir={ar ? 'rtl' : 'ltr'} style={{ containerType: 'inline-size', color: '#414142', background: '#fff' }}>
      {/* hero */}
      <section style={{ background: '#052640', backgroundImage: 'radial-gradient(circle at 78% 30%, rgba(7,112,186,0.55), rgba(5,38,64,0) 55%)', color: '#fff' }}>
        <header style={{ maxWidth: 1560, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {/* the site header above already carries the logo */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginInlineStart: 'auto' }}>
            {paid ? (
              <>
                {dl.altLabel && <button type="button" onClick={dl.onAlt} disabled={dl.busy} style={{ cursor: 'pointer', font: 'inherit', background: 'transparent', color: '#fff', border: '1px solid rgba(156,199,232,0.35)', fontWeight: 700, fontSize: 15, padding: '0 14px', borderRadius: 10, minHeight: 44 }}>{dl.altLabel}</button>}
                <button type="button" onClick={dl.onDownload} disabled={dl.busy} style={{ border: 0, cursor: 'pointer', font: 'inherit', background: '#00c9a7', color: '#04323f', fontWeight: 800, fontSize: 15, padding: '0 18px', borderRadius: 12, minHeight: 44, opacity: dl.busy ? 0.6 : 1 }}>{dl.busy ? dl.busyLabel : dl.label}</button>
              </>
            ) : (
              <A href="#rt-pass" track="results_careers_upgrade" preview={p} style={{ display: 'inline-flex', alignItems: 'center', background: '#00c9a7', color: '#04323f', fontWeight: 800, fontSize: 15, padding: '0 18px', borderRadius: 12, minHeight: 44 }}>{c.getFull}</A>
            )}
          </span>
        </header>
        {dl.error && <p style={{ margin: 0, textAlign: 'center', color: '#fda4af', fontSize: 13 }}>{dl.error}</p>}
        <div style={{ maxWidth: 1560, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexWrap: 'wrap', gap: 36, alignItems: 'center' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...eyebrow('#00c9a7'), fontWeight: 500 }}>{c.eyebrow(data.riasecCode)}</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px, 6.4cqw, 58px)', lineHeight: 1.08, fontWeight: 800 }}>
              {paid ? c.h1aPaid(n) : c.h1a}<br /><span style={{ color: '#9cc7e8' }}>{paid ? c.h1bPaid : c.h1b}</span>
            </h1>
            {top && <p style={{ margin: 0, fontSize: 'clamp(16px, 2.4cqw, 19px)', lineHeight: 1.6, color: '#c9dcef', maxWidth: 560 }}>{c.sub(data.topTypeLabel)}<strong style={{ color: '#fff' }}>{top.title}</strong>.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1, background: 'rgba(156,199,232,0.2)', border: '1px solid rgba(156,199,232,0.2)', borderRadius: 18, overflow: 'hidden', maxWidth: 520 }}>
              {[[String(n), c.careersMatched, false], [top ? `${clampScore(top.match)}%` : '-', c.topMatch, true], ['90', c.plan, false]].map(([v, k, hi]) => (
                <div key={k as string} style={{ background: '#072d4b', padding: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: hi ? '#00c9a7' : undefined }}>{v as string}</span>
                  <span style={{ fontSize: 14, color: '#b9cfe3' }}>{k as string}</span>
                </div>
              ))}
            </div>
            {!paid && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <A href="#rt-pass" track="results_careers_upgrade" preview={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#00c9a7', color: '#04323f', fontWeight: 800, fontSize: 18, padding: '0 26px', borderRadius: 14, minHeight: 56 }}>{c.unlockAll}<Arrow flip={ar} /></A>
                <A href="#rt-profile" preview={p} style={{ display: 'inline-flex', alignItems: 'center', color: '#fff', fontWeight: 700, fontSize: 16, padding: '0 20px', border: '1px solid rgba(156,199,232,0.4)', borderRadius: 14, minHeight: 56 }}>{c.preview}</A>
              </div>
            )}
          </div>
          <div style={{ flex: '1 1 380px', minWidth: 0, padding: '0 8px' }}>
            <Constellation data={data} unlockedLabel={c.mapBest} lowestLabel={c.mapLowest} lockedLabel={c.mapLocked} />
          </div>
        </div>
      </section>

      {/* profile (free plan; on paid plans the report's own profile section follows, in this look) */}
      {!paid && (
      <section id="rt-profile" style={wrap}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={eyebrow('#0a705a')}>{paid ? c.yourProfile : c.freeProfile}</div>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 5.4cqw, 42px)', fontWeight: 800, color: '#1f2a37' }}>{c.who}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[[c.careerType, data.topTypeLabel], [c.topValue, data.values[0]?.label], [c.topStrength, data.strengths[0]?.label]].filter(x => x[1]).map(([k, v]) => (
            <div key={k} style={{ background: '#f4f9ff', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: ls('0.12em'), color: '#0b5c99' }}>{k}</span>
              <span style={{ fontSize: 'clamp(22px, 3.6cqw, 28px)', fontWeight: 800, color: '#1f2a37', overflowWrap: 'anywhere' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
          <div style={{ ...outline, flex: '1 1 380px', minWidth: 0, padding: 24, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
            {hasScores && <Hexagon data={data} />}
            <div style={{ flex: '1 1 160px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2a37' }}>{c.interests}</h3>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: '#4d5056' }}>
                {[...data.riasec].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3).map(r => (typeof r.score === 'number' ? `${r.label} ${clampScore(r.score)}` : r.label)).join(' · ')}
              </p>
            </div>
          </div>
          <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...outline, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1f2a37' }}>{c.valuesStrengths}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[...data.values, ...data.strengths].map((v, i) => (
                  <span key={`${v.label}${i}`} style={{ background: i % 3 === 0 ? '#075288' : '#e6f1fa', color: i % 3 === 0 ? '#fff' : '#0b5c99', borderRadius: 999, padding: '7px 14px', fontWeight: 700, fontSize: 15 }}>{v.label}{typeof v.score === 'number' ? ` ${clampScore(v.score)}` : ''}</span>
                ))}
              </div>
            </div>
            {data.personality && data.personality.length > 0 && (
              <div style={{ ...outline, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1f2a37' }}>{c.persTitle}</h3>
                {data.personality.map(t => (
                  <div key={t.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 150px) minmax(0, 1fr) 36px', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{t.label}</span>
                    <span style={{ height: 8, background: '#ebf3ff', borderRadius: 5 }}><span style={{ display: 'block', height: '100%', width: `${clampScore(t.score ?? 50)}%`, background: '#0770ba', borderRadius: 5 }} /></span>
                    <span style={{ fontFamily: MONO, color: '#075288', fontWeight: 600, textAlign: ar ? 'left' : 'right' }}>{typeof t.score === 'number' ? clampScore(t.score) : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      )}

      {/* careers (free plan; on paid plans the report's own careers section follows) */}
      {!paid && top && (
        <section style={wrap}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={eyebrow('#0a705a')}>{paid ? c.matchesPaid(n) : c.matchesFree(n)}</div>
            <h2 style={{ margin: 0, fontSize: 'clamp(26px, 5.4cqw, 42px)', fontWeight: 800, color: '#1f2a37' }}>{c.careersTitle}</h2>
          </div>

          <div style={{ background: '#052640', color: '#fff', borderRadius: 26, padding: 'clamp(22px, 4cqw, 34px)', display: 'flex', flexWrap: 'wrap', gap: 32 }}>
            <div style={{ flex: '1.2 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: '#00c9a7', lineHeight: 1 }}>{clampScore(top.match)}%</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: ls('0.14em'), color: '#9cc7e8' }}>{c.matchOf}</span>
                  <span style={{ fontSize: 15, color: '#c9dcef' }}>{[fitText(top.fit), tag(top.direction)].filter(Boolean).join(' · ')}</span>
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 'clamp(26px, 5cqw, 38px)', fontWeight: 800, overflowWrap: 'anywhere' }}>{top.title}</h3>
              {top.summary && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: '#c9dcef' }}>{top.summary}</p>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {top.risk && <span style={{ background: 'rgba(255,241,209,0.12)', color: '#f0c25e', border: '1px solid rgba(240,194,94,0.4)', borderRadius: 999, padding: '6px 14px', fontWeight: 700, fontSize: 14 }}>{c.riskLabel(c.risk[top.risk] || top.risk)}</span>}
                {top.gap && <span style={{ background: 'rgba(156,199,232,0.12)', color: '#e6f1fa', border: '1px solid rgba(156,199,232,0.3)', borderRadius: 999, padding: '6px 14px', fontWeight: 700, fontSize: 14 }}>{c.gapLabel(top.gap)}</span>}
              </div>
            </div>
            {!paid && (
              <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: ls('0.14em'), color: '#9cc7e8' }}>{c.unlockFor}</div>
                {[c.unl1, c.unl2, c.unl3].map(([a, b]) => (
                  <div key={a} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid rgba(156,199,232,0.22)', borderRadius: 14, padding: '14px 16px' }}>
                    <span style={{ fontWeight: 700 }}>{a}</span><span style={{ fontSize: 14, color: '#9cc7e8' }}>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(rest.length > 0 || data.lockedMore > 0) && (
            <div style={{ ...outline, overflowX: 'auto' }}>
              {(() => {
                const cols = '48px minmax(180px, 1.4fr) minmax(140px, 2fr) 130px 130px'
                const row: CSSProperties = { display: 'grid', minWidth: 720, gridTemplateColumns: cols, gap: 16, alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #eef3f9' }
                return (
                  <>
                    <div style={{ ...row, borderTop: 0, padding: '14px 24px', background: '#f6f8fb', fontFamily: mono, fontSize: 12, letterSpacing: ls('0.1em'), color: '#545968' }}>
                      <span>{c.th[0]}</span><span>{c.th[1]}</span><span>{c.th[2]}</span><span>{c.th[3]}</span><span style={{ textAlign: ar ? 'left' : 'right' }}>{c.th[4]}</span>
                    </div>
                    {rest.map((r, i) => (
                      <div key={i} style={{ ...row, background: r.risk === 'low' ? '#f3fbf8' : undefined, opacity: r.rejected ? 0.55 : 1 }}>
                        <span style={{ fontFamily: MONO, color: '#545968' }}>{String(i + 2).padStart(2, '0')}</span>
                        <strong style={{ fontSize: 18, color: '#1f2a37', overflowWrap: 'anywhere' }}>{r.title}</strong>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ flex: 1, height: 8, background: '#ebf3ff', borderRadius: 5 }}><span style={{ display: 'block', width: `${clampScore(r.match)}%`, height: '100%', background: r.match >= 88 ? '#0770ba' : '#9cc7e8', borderRadius: 5 }} /></span>
                          <strong style={{ color: '#075288' }}>{clampScore(r.match)}%</strong>
                        </span>
                        <span style={{ justifySelf: 'start' }}>
                          {r.risk
                            ? <span style={r.risk === 'low' ? { fontSize: 13, fontWeight: 800, color: '#fff', background: '#0a705a', borderRadius: 999, padding: '4px 10px' } : { fontSize: 13, fontWeight: 700, color: r.risk === 'high' ? '#a1261a' : '#8a5300', background: r.risk === 'high' ? '#fde4e1' : '#fff1d1', borderRadius: 999, padding: '4px 10px' }}>{c.risk[r.risk] || r.risk}</span>
                            : <span style={{ color: '#6b707a' }}>-</span>}
                        </span>
                        <span style={{ justifySelf: ar ? 'start' : 'end' }}>
                          {paid
                            ? <span style={{ fontSize: 14, color: '#5c6068' }}>{tag(r.direction)}</span>
                            : <A href="#rt-pass" track="results_careers_upgrade" preview={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#075288', minHeight: 44 }}><Lock size={14} />{c.locked}</A>}
                        </span>
                      </div>
                    ))}
                    {data.lockedMore > 0 && (
                      <A href="#rt-pass" track="results_careers_upgrade" preview={p} style={{ ...row, color: '#075288', fontWeight: 700 }}>
                        <span><Lock size={14} /></span>
                        <span style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 3' }}>
                          <strong style={{ color: '#1f2a37' }}>{data.locked.moreTitle}</strong>
                          <span style={{ fontWeight: 500, color: '#5c6068', fontSize: 14 }}>{data.locked.moreBody}</span>
                        </span>
                        <span style={{ justifySelf: ar ? 'start' : 'end' }}><Arrow flip={ar} /></span>
                      </A>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </section>
      )}

      {/* chapters + free vs full (free plan) */}
      {!paid && (
        <>
          <section style={{ ...wrap, flexDirection: 'row', flexWrap: 'wrap', gap: 44 }}>
            <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={eyebrow('#0a705a')}>{c.inside}</div>
              <h2 style={{ margin: 0, fontSize: 'clamp(26px, 5cqw, 40px)', lineHeight: 1.1, fontWeight: 800, color: '#1f2a37' }}>{c.insideH}</h2>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: '#4d5056' }}>{c.insideP}</p>
            </div>
            <div style={{ flex: '2 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {c.chapters.map(([h, b], i, arr) => (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) 24px', gap: 14, padding: '18px 0', borderTop: '1px solid #e3ebf4', borderBottom: i === arr.length - 1 ? '1px solid #e3ebf4' : undefined, alignItems: 'start' }}>
                  <span style={{ fontFamily: MONO, fontSize: 21, color: '#0770ba', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><strong style={{ fontSize: 20, color: '#1f2a37' }}>{h}</strong><span style={{ fontSize: 16, color: '#5c6068' }}>{b}</span></span>
                  <span style={{ color: '#5c6068', paddingTop: 4 }}><Lock size={18} /></span>
                </div>
              ))}
            </div>
          </section>

          <section id="rt-pass" style={{ ...wrap, flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'stretch', paddingBottom: 48 }}>
            <div style={{ ...outline, borderRadius: 24, overflow: 'hidden', flex: '1.3 1 420px', minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 96px 96px', gap: 12, padding: '16px 22px', background: '#f6f8fb', alignItems: 'end' }}>
                <strong style={{ fontSize: 18, color: '#1f2a37' }}>{c.compare}</strong>
                <span style={{ textAlign: 'center', fontWeight: 700, color: '#545968' }}>{c.free}</span>
                <span style={{ textAlign: 'center', fontWeight: 800, color: '#075288' }}>{c.fullR}</span>
              </div>
              {c.rows.map(([label, f]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 96px 96px', gap: 12, padding: '13px 22px', borderTop: '1px solid #eef3f9', alignItems: 'center' }}>
                  <span>{label}</span>
                  <span style={{ textAlign: 'center', color: f === 1 ? '#0a705a' : '#6b707a', display: 'flex', justifyContent: 'center' }}>{f === 1 ? <Check /> : f}</span>
                  <span style={{ textAlign: 'center', color: '#0a705a', display: 'flex', justifyContent: 'center' }}><Check /></span>
                </div>
              ))}
            </div>
            <div style={{ flex: '1 1 320px', minWidth: 0, background: '#052640', color: '#fff', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: ls('0.16em'), color: '#00c9a7' }}>{c.passTag}</div>
              <h2 style={{ margin: 0, fontSize: 'clamp(26px, 4.6cqw, 34px)', lineHeight: 1.14, fontWeight: 800 }}>{c.passH}</h2>
              <p style={{ margin: 0, fontSize: 15, color: '#c9dcef', lineHeight: 1.5 }}>{data.locked.planBody}</p>
              <A href={data.unlockHref} track="results_unlock_all" preview={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#00c9a7', color: '#04323f', fontWeight: 800, fontSize: 18, borderRadius: 14, minHeight: 56 }}>{data.locked.planCta}</A>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, color: '#c9dcef' }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ color: '#00c9a7' }}><Check size={16} /></span>{c.pass1}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ color: '#00c9a7' }}><Check size={16} /></span>{c.pass2}</span>
              </div>
            </div>
          </section>
        </>
      )}
      <div style={{ height: 24 }} />
    </div>
  )
}
