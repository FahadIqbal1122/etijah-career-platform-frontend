'use client'

import ClarityTemplate from './ClarityTemplate'
import ConstellationTemplate from './ConstellationTemplate'
import { Hexagon } from './visuals'
import type { ReportTemplateData, ReportTemplateId } from './types'

export { REPORT_TEMPLATE_IDS } from './types'
export type { ReportTemplateData, ReportTemplateId, TemplateCareer, TemplateScore } from './types'

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
    description: 'Option A of the report directions: light and calm. Big headline, your best match as a ring, a progress meter, a #1 match card and an unlock panel.',
    tags: ['Light', 'Progress meter', 'Ring hero'],
    swatch: ['#ffffff', '#0770ba', '#ebf3ff', '#00c9a7'],
  },
  {
    id: 'clarity-map',
    name: 'Clarity Plus',
    tagline: 'Light · map and graph',
    description: 'Clarity with two graphics from Constellation: the career constellation at the top (in the hero, as in Constellation), and the interests hexagon in the profile.',
    tags: ['Light', 'Hexagon graph', 'Career constellation'],
    swatch: ['#ffffff', '#0770ba', '#f4f9ff', '#00c9a7'],
  },
  {
    id: 'constellation',
    name: 'Constellation',
    tagline: 'Dark · premium',
    description: 'Option B of the report directions: dark and premium. Careers drawn as a rising constellation, the interests hexagon, a careers table, and the Free vs Full comparison.',
    tags: ['Dark', 'Constellation', 'Hexagon graph', 'Free vs Full'],
    swatch: ['#052640', '#00c9a7', '#0770ba', '#9cc7e8'],
  },
]

export function isReportTemplateId(v: unknown): v is ReportTemplateId {
  return v === 'default' || v === 'clarity' || v === 'clarity-map' || v === 'constellation'
}

// Renders a non-default template as the top of the results page. 'default' is the page itself.
export function ReportTemplateView({ id, data }: { id: ReportTemplateId; data: ReportTemplateData }) {
  if (id === 'clarity') return <ClarityTemplate data={data} />
  if (id === 'clarity-map') return <ClarityTemplate data={data} withMap />
  if (id === 'constellation') return <ConstellationTemplate data={data} />
  return null
}

// The interests hexagon, for placing inside the report's own interests card (paid plans).
export function ProfileHexagon({ data }: { data: ReportTemplateData }) {
  return <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Hexagon data={data} /></div>
}

// Made-up data for the admin preview (no real person). `paid` only changes what the page itself changes: the
// careers given (3 free + 5 locked, 8 paid), the locked cards and the download action.
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
  const shown = paid ? 8 : 3
  return {
    locale,
    paid,
    preview: true,
    riasec: riasec.map(([key, label, score]) => ({ key, label, score })),
    riasecCode: 'ICR',
    topTypeLabel: ar ? 'استقصائي' : 'Investigative',
    values: ar
      ? [{ label: 'خدمة الوطن', score: 100 }, { label: 'الثروة', score: 90 }, { label: 'الإبداع', score: 80 }]
      : [{ label: 'National Contribution', score: 100 }, { label: 'Wealth', score: 90 }, { label: 'Creativity', score: 80 }],
    strengths: ar
      ? [{ label: 'التفكير الاستراتيجي', score: 100 }, { label: 'التعلّم', score: 100 }, { label: 'التنفيذ', score: 80 }]
      : [{ label: 'Strategic Thinking', score: 100 }, { label: 'Learning', score: 100 }, { label: 'Execution', score: 80 }],
    personality: ar
      ? [{ label: 'الانفتاح', score: 80 }, { label: 'الضمير الحي', score: 100 }, { label: 'الانبساط', score: 20 }, { label: 'الوداعة', score: 50 }, { label: 'الاتزان', score: 80 }]
      : [{ label: 'Openness', score: 80 }, { label: 'Conscientiousness', score: 100 }, { label: 'Extraversion', score: 20 }, { label: 'Agreeableness', score: 50 }, { label: 'Stability', score: 80 }],
    careers: all.slice(0, shown).map(([title, match], i) => ({
      title: title as string,
      match: match as number,
      risk: risks[i],
      direction: i % 3 === 2 ? 'new_direction' as const : 'builds_on_background' as const,
      fit: i < 4 ? 'strong_fit' as const : 'worth_exploring' as const,
      summary: ar
        ? 'هذا المسار يبني على دراستك. درجتك المرتفعة في الاهتمام الاستقصائي تعني أنك تستمتع بفهم الأنظمة المعقدة وحل مشكلاتها.'
        : 'This career builds on your studies. Your high Investigative score says you enjoy understanding complex systems and solving problems.',
      ...(i === 0 ? { gap: ar ? 'خبرة عملية في مشاريع حقيقية.' : 'Practical experience on real projects.' } : {}),
    })),
    lockedMore: paid ? 0 : 3,
    labels: ar
      ? { builds_on_background: 'يبني على خلفيتك', new_direction: 'اتجاه جديد', strong_fit: 'تطابق قوي', worth_exploring: 'يستحق الاستكشاف' }
      : { builds_on_background: 'Builds on your background', new_direction: 'A new direction', strong_fit: 'Strong fit', worth_exploring: 'Worth exploring' },
    unlockHref: '#',
    locked: ar ? {
      moreTitle: 'افتح ٥ مسارات مهنية أخرى', moreBody: 'رقِّ إلى مرشد المسار لترى المسارات الخمسة الأخرى التي تناسبك، مع التفاصيل الكاملة لكل منها.',
      planTitle: 'افتح خطتك', planBody: 'احصل على خطوتك الأولى هذا الأسبوع وخطة الأيام التسعين والمهارات والتمرين التطبيقي.', planCta: 'افتح التقرير الكامل',
    } : {
      moreTitle: 'Unlock 5 more careers', moreBody: 'Upgrade to Pathfinder to see the other 5 careers that fit you, each with the full detail.',
      planTitle: 'Unlock your plan', planBody: 'Get your first step for this week, your 90-day roadmap, and the skills and practice exercise to build for it.', planCta: 'Unlock Full Report',
    },
    download: { label: ar ? 'تحميل التقرير PDF' : 'Download PDF Report', altLabel: ar ? 'تحميل النسخة الإنجليزية' : 'Download Arabic PDF', busyLabel: '…' },
  }
}
