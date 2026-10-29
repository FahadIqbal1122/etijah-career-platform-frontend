'use client'

// The top of a sample report: the live report template (Clarity Plus: career constellation, ring, interests hexagon),
// fed with the sample's fixed data. Client component because the template's download button takes a click handler.
import { ReportTemplateView, type ReportTemplateData } from '@/components/report-templates'

export default function SampleTemplateHero({ data, pdfHref, altPdfHref }: { data: ReportTemplateData; pdfHref: string; altPdfHref: string }) {
  const withDownload: ReportTemplateData = {
    ...data,
    download: {
      ...data.download,
      onDownload: () => window.open(pdfHref, '_blank', 'noopener'),
      onAlt: () => window.open(altPdfHref, '_blank', 'noopener'),
    },
  }
  return <ReportTemplateView id="clarity-map" data={withDownload} />
}
