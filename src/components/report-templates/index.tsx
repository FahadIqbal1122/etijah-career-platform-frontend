'use client'

import TemplateHero from './TemplateHero'
import { Constellation, Hexagon } from './visuals'
import type { ReportTemplateData, ReportTemplateId } from './types'

export { REPORT_TEMPLATE_IDS } from './types'
export type { ReportTemplateData, ReportTemplateId, TemplateCareer, TemplateScore, TemplateStrings, TemplateDownload } from './types'

export interface ReportTemplateInfo {
  id: ReportTemplateId
  name: string
  tagline: string
  description: string
  tags: string[]
  swatch: string[]
}

// What the admin dashboard lists. Templates are design only: the free/paid content of the report never changes.
export const REPORT_TEMPLATES: ReportTemplateInfo[] = [
  {
    id: 'default',
    name: 'Default',
    tagline: 'The current report',
    description: 'The report as it is today.',
    tags: ['Current'],
    swatch: ['#075288', '#ffffff', '#ebf3ff', '#00c9a7'],
  },
  {
    id: 'clarity',
    name: 'Clarity',
    tagline: 'Light · calm',
    description: 'A light, calm look: a bright hero with your best match as a ring, clean cards with a soft blue outline.',
    tags: ['Light', 'Ring hero'],
    swatch: ['#ffffff', '#0770ba', '#ebf3ff', '#00c9a7'],
  },
  {
    id: 'clarity-map',
    name: 'Clarity Plus',
    tagline: 'Light · map and graph',
    description: 'The Clarity look plus two graphics from Constellation: the interests hexagon in the profile, and the career constellation above the career cards.',
    tags: ['Light', 'Hexagon graph', 'Career constellation'],
    swatch: ['#ffffff', '#0770ba', '#f4f9ff', '#00c9a7'],
  },
  {
    id: 'constellation',
    name: 'Constellation',
    tagline: 'Dark · premium',
    description: 'A dark, premium hero with your careers drawn as a rising constellation, navy section bars, and the interests hexagon in the profile.',
    tags: ['Dark', 'Constellation hero', 'Hexagon graph'],
    swatch: ['#052640', '#00c9a7', '#0770ba', '#9cc7e8'],
  },
]

export function isReportTemplateId(v: unknown): v is ReportTemplateId {
  return v === 'default' || v === 'clarity' || v === 'clarity-map' || v === 'constellation'
}

// What each template adds to the page.
export function templateFeatures(id: ReportTemplateId) {
  return {
    hero: id === 'clarity' || id === 'clarity-map' ? ('clarity' as const) : id === 'constellation' ? ('constellation' as const) : null,
    hexagon: id === 'clarity-map' || id === 'constellation',
    careerMap: id === 'clarity-map',
  }
}

export function ReportTemplateHero({ id, data }: { id: ReportTemplateId; data: ReportTemplateData }) {
  const f = templateFeatures(id)
  return f.hero ? <TemplateHero data={data} variant={f.hero} /> : null
}

// The interests hexagon, placed above the interest bars in the profile.
export function ProfileHexagon({ data }: { data: ReportTemplateData }) {
  return <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Hexagon data={data} /></div>
}

// The career constellation (light version), placed at the top of the careers section.
export function CareerMap({ data }: { data: ReportTemplateData }) {
  if (!data.careers.length) return null
  return (
    <div className="card p-5">
      <p className="rp-h text-charcoal mb-3">{data.strings.mapTitle}</p>
      <div style={{ background: '#f4f9ff', borderRadius: 16, padding: 'clamp(8px, 2vw, 20px)' }}>
        <Constellation data={data} unlockedLabel={data.strings.mapUnlocked} lowestLabel={data.strings.mapLowestRisk} tone="light" />
      </div>
    </div>
  )
}

// Made-up data for the admin preview (no real person). `paid` only changes what the page itself changes: the
// download action and how many careers the person is given (3 free, 8 paid).
export function sampleTemplateData(locale: 'en' | 'ar', paid: boolean): ReportTemplateData {
  const ar = locale === 'ar'
  const riasec = [
    ['realistic', ar ? 'واقعي' : 'Realistic', 47], ['investigative', ar ? 'استقصائي' : 'Investigative', 100], ['artistic', ar ? 'فني' : 'Artistic', 40],
    ['social', ar ? 'اجتماعي' : 'Social', 27], ['enterprising', ar ? 'مبادر' : 'Enterprising', 50], ['conventional', ar ? 'تقليدي' : 'Conventional', 80],
  ] as const
  const all = ar
    ? [['مهندس برمجيات', 95], ['مهندس DevOps', 92], ['مطور تطبيقات جوال', 90], ['محلل أمن سيبراني', 88], ['مهندس شبكات', 85], ['محلل نظم', 82], ['مدير قواعد بيانات', 80], ['مهندس اتصالات', 78]]
    : [['Software Engineer', 95], ['DevOps Engineer', 92], ['Mobile App Developer', 90], ['Cybersecurity Analyst', 88], ['Network Engineer', 85], ['Systems Analyst', 82], ['Database Administrator', 80], ['Telecom Engineer', 78]]
  const risks: Array<'low' | 'medium' | 'high'> = ['medium', 'medium', 'medium', 'low', 'medium', 'medium', 'medium', 'medium']
  return {
    locale,
    preview: true,
    strings: ar ? {
      eyebrow: 'نتائج التقييم المهني', title: 'ملفك المهني', subtitle: 'هذا ما تقوله إجاباتك عنك، والمسارات المهنية المناسبة لك، وما تفعله بعد ذلك',
      typeLine: 'نمط استقصائي', codeLine: 'RIASEC: ICR',
      topValue: { label: 'أهم قيمة', value: 'خدمة الوطن' }, topStrength: { label: 'أبرز نقطة قوة', value: 'التفكير الاستراتيجي' },
      match: 'تطابق', aiRisk: 'أثر الذكاء الاصطناعي', careers: 'مسارات', topMatch: 'أفضل مسار لك',
      riskName: { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' }, directionName: { builds_on_background: 'يبني على خلفيتك', new_direction: 'اتجاه جديد' },
      mapTitle: 'كوكبة مساراتك المهنية', mapUnlocked: 'الأفضل', mapLowestRisk: 'الأقل تأثراً بالذكاء الاصطناعي', hexTitle: 'اهتماماتك',
    } : {
      eyebrow: 'Career Assessment Results', title: 'Your Career Profile', subtitle: 'Here is what your answers say about you, the careers that fit, and what to do next',
      typeLine: 'Investigative type', codeLine: 'RIASEC: ICR',
      topValue: { label: 'Top value', value: 'National Contribution' }, topStrength: { label: 'Top strength', value: 'Strategic Thinking' },
      match: 'match', aiRisk: 'AI risk', careers: 'careers', topMatch: 'YOUR #1 CAREER MATCH',
      riskName: { low: 'Low', medium: 'Medium', high: 'High' }, directionName: { builds_on_background: 'Builds on your background', new_direction: 'New direction' },
      mapTitle: 'Your career constellation', mapUnlocked: 'best match', mapLowestRisk: 'LOWEST AI RISK', hexTitle: 'Your interests',
    },
    riasec: riasec.map(([key, label, score]) => ({ key, label, score })),
    careers: all.slice(0, paid ? 8 : 3).map(([title, match], i) => ({
      title: title as string, match: match as number, risk: risks[i],
      direction: i % 3 === 2 ? 'new_direction' as const : 'builds_on_background' as const,
    })),
    download: paid
      ? { locked: false, lockedLabel: '', href: '#', label: ar ? 'تحميل التقرير PDF' : 'Download PDF Report', altLabel: ar ? 'تحميل النسخة الإنجليزية' : 'Download Arabic PDF', busyLabel: '…' }
      : { locked: true, lockedLabel: ar ? 'تحميل PDF (مرشد المسار)' : 'Download PDF (Pathfinder)', href: '#', label: '', busyLabel: '…' },
  }
}

// A cut-down report for the admin preview: the template's hero, then a section bar, the profile card (with the
// hexagon when the template has it), and the career card (with the constellation when it has it).
export function TemplatePreview({ id, data }: { id: ReportTemplateId; data: ReportTemplateData }) {
  const f = templateFeatures(id)
  const ar = data.locale === 'ar'
  const sorted = [...data.riasec].sort((a, b) => b.score - a.score)
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className={`rt-${id} brand-surface`} style={{ minHeight: 200 }}>
      <ReportTemplateHero id={id} data={data} />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="report-section-bar w-full flex items-center justify-between rounded-xl bg-white/70 border border-[var(--line)] px-4 py-2.5">
          <span className="rp-h text-charcoal">{data.strings.hexTitle}</span><span aria-hidden="true">▾</span>
        </div>
        <div className="card p-5">
          {f.hexagon && <ProfileHexagon data={data} />}
          <div className="space-y-2.5">
            {sorted.map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-sm"><span className="font-medium">{r.label}</span><span className="font-semibold">{r.score}%</span></div>
                <div className="w-full bg-lightblue rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${r.score}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        {f.careerMap && <CareerMap data={data} />}
        <div className="card p-5 space-y-2">
          {data.careers.slice(0, 3).map(c => (
            <div key={c.title} className="flex justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-3">
              <span className="rp-h">{c.title}</span><span className="rp-pill rp-blue">{c.match}% {data.strings.match}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
