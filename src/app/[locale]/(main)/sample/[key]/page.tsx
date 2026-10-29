import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { DEMO_REPORTS, type DemoReportKey } from '@/data/demoReports'
import SampleReportView, { type SampleData } from '@/components/sample/SampleReportView'
// import SampleReportViewSimple, { type SampleBlock } from '@/components/sample/SampleReportViewSimple'   // only the old "general" sample used it

// Shareable web version of each sample report PDF (public/demo-reports/<key>-<en|ar>.pdf). The content in
// src/data/sampleReports/<key>-<locale>.json is extracted from those PDFs, so the page and the PDF always say the same thing.
// "free" is not offered (the free preview was removed from the sample chooser).
// "general" is only kept so old links work: it redirects to the recent-graduate sample
const KEYS: string[] = [...DEMO_REPORTS.map(r => r.key).filter(k => k !== 'free'), 'general']

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
  if (key === 'general') redirect(`/${l}/sample/recent_graduate`)
  const meta = DEMO_REPORTS.find(r => r.key === key)
  if (!meta || !KEYS.includes(meta.key)) notFound()
  const data = (await import(`@/data/sampleReports/${key}-${l}.json`)).default
  return <SampleReportView data={data as SampleData} reportKey={key as DemoReportKey} locale={l} title={meta.title[l]} />
}
