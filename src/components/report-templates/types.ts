// Report templates: whole-page designs for the results report (Etijahi Report Directions, options A and B),
// chosen by an admin (Report templates tab). A template changes the style and layout only. What each plan gets
// is decided by the report page and is the same for every template: free sees the careers it is given, no plan
// and the locked cards; paid sees everything. 'default' is the page exactly as it has always been.

export type ReportTemplateId = 'default' | 'clarity' | 'clarity-map' | 'constellation'

export const REPORT_TEMPLATE_IDS: ReportTemplateId[] = ['default', 'clarity', 'clarity-map', 'constellation']

export interface TemplateScore { key?: string; label: string; score: number }

export interface TemplateCareer {
  title: string
  match: number
  summary?: string
  risk?: 'low' | 'medium' | 'high'
  direction?: 'builds_on_background' | 'new_direction'
  gap?: string
}

export interface ReportTemplateData {
  locale: 'en' | 'ar'
  // false = free plan (the locked cards), true = a paid plan
  paid: boolean
  // the six RIASEC types in the fixed order R, I, A, S, E, C
  riasec: TemplateScore[]
  riasecCode: string
  topTypeLabel: string
  values: TemplateScore[]
  strengths: TemplateScore[]
  personality?: TemplateScore[]
  // exactly the careers the page gives this person, best match first (free plan: 3)
  careers: TemplateCareer[]
  // careers that exist but are locked on this plan (free plan: 5, paid: 0)
  lockedMore: number
  unlockHref: string
  // existing page translations for the locked cards, so the wording matches the default report
  locked: { moreTitle: string; moreBody: string; planTitle: string; planBody: string; planCta: string }
  download: {
    label: string
    altLabel?: string
    busy?: boolean
    busyLabel: string
    onDownload?: () => void
    onAlt?: () => void
    error?: string
  }
  // admin preview: links go nowhere
  preview?: boolean
}
