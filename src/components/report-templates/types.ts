// Report templates: whole-page designs for the results report (Etijahi Report Directions, options A and B),
// chosen by an admin (Report templates tab). A template changes the style and layout only. What each plan gets
// is decided by the report page and is the same for every template: free sees the careers it is given, no plan
// and the locked cards; paid sees everything. 'default' is the page exactly as it has always been.

export type ReportTemplateId = 'default' | 'clarity' | 'clarity-map' | 'constellation'

export const REPORT_TEMPLATE_IDS: ReportTemplateId[] = ['default', 'clarity', 'clarity-map', 'constellation']

// score is missing when the report has no scores for it (the template then shows the label only)
export interface TemplateScore { key?: string; label: string; score?: number }

export interface TemplateCareer {
  title: string
  match: number
  summary?: string
  risk?: 'low' | 'medium' | 'high'
  direction?: 'builds_on_background' | 'new_direction'
  // the backend's own fit tag, so the template never contradicts the default report
  fit?: 'strong_fit' | 'worth_exploring'
  // the person marked it "not for me"
  rejected?: boolean
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
  // exactly the careers the page gives this person, in the page's order (the career the plan is built around
  // first, "not for me" ones last). Free plan: 3
  careers: TemplateCareer[]
  // placeholders for the careers locked on this plan (free plan: a few dim stars, paid: 0). It is a hint that
  // there are more, never a count: the real total is not known to the page.
  lockedMore: number
  // the page's own translations for tags, so wording matches the default report (and the person's situation)
  labels: { builds_on_background: string; new_direction: string; strong_fit: string; worth_exploring: string }
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
