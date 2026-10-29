import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { DEMO_REPORTS, type DemoReportKey } from '@/data/demoReports'
import SampleReportView, { type SampleData } from '@/components/sample/SampleReportView'
import SampleReportViewSimple, { type SampleBlock } from '@/components/sample/SampleReportViewSimple'

// Shareable web version of each sample report PDF (public/demo-reports/<key>-<en|ar>.pdf). The content in
// src/data/sampleReports/<key>-<locale>.json is extracted from those PDFs, so the page and the PDF always say the same thing.
// "free" is not offered (the free preview was removed from the sample chooser).
const KEYS: string[] = DEMO_REPORTS.map(r => r.key).filter(k => k !== 'free')

export const dynamicParams = false

export function generateStaticParams() {
  return routing.locales.flatMap(locale => KEYS.map(key => ({ locale, key })))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; key: string }> }): Promise<Metadata> {
  const { locale, key } = await params
  const r = DEMO_REPORTS.find(x => x.key === key)
  if (!r) return {}
  const l = locale === 'ar' ? 'ar' : 'en'
  return {
    title: `${r.title[l]} — ${l === 'ar' ? 'نموذج تقرير إتجاهي' : 'Etijahi sample report'}`,
    description: r.body[l],
    robots: { index: false, follow: true },
  }
}

export default async function Page({ params }: { params: Promise<{ locale: string; key: string }> }) {
  const { locale, key } = await params
  const l = locale === 'ar' ? 'ar' : 'en'
  const meta = DEMO_REPORTS.find(r => r.key === key)
  if (!meta || !KEYS.includes(meta.key)) notFound()
  const data = (await import(`@/data/sampleReports/${key}-${l}.json`)).default
  // "general" is the older single sample (a different, flatter template), so it keeps the plain layout.
  if (key === 'general') return <SampleReportViewSimple blocks={data as SampleBlock[]} reportKey={key} locale={l} title={meta.title[l]} />
  return <SampleReportView data={data as SampleData} reportKey={key as DemoReportKey} locale={l} title={meta.title[l]} />
}
