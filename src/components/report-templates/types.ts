// Report templates are DESIGN ONLY: a look for the results report, chosen by an admin (Report templates tab).
// What is shown or hidden on the free and paid plans is decided by the report page itself and is the same for
// every template; a template only changes the hero, the theme (colours, shapes) and adds the optional graphics.
// 'default' is the page exactly as it has always been.

export type ReportTemplateId = 'default' | 'clarity' | 'clarity-map' | 'constellation'

export const REPORT_TEMPLATE_IDS: ReportTemplateId[] = ['default', 'clarity', 'clarity-map', 'constellation']

export interface TemplateScore { key?: string; label: string; score: number }

// A career exactly as the page shows it to this person (free plan: the 3 it is given).
export interface TemplateCareer {
  title: string
  match: number
  risk?: 'low' | 'medium' | 'high'
  direction?: 'builds_on_background' | 'new_direction'
}

// Text already in the page language (the page passes its own translations).
export interface TemplateStrings {
  eyebrow: string
  title: string
  subtitle: string
  typeLine: string
  codeLine: string
  topValue?: { label: string; value: string }
  topStrength?: { label: string; value: string }
  match: string
  aiRisk: string
  careers: string
  topMatch: string
  riskName: Record<string, string>
  directionName: Record<string, string>
  mapTitle: string
  mapUnlocked: string
  mapLowestRisk: string
  hexTitle: string
}

export interface TemplateDownload {
  // free plan: a locked link to the plans; paid: download buttons
  locked: boolean
  lockedLabel: string
  href: string
  label: string
  altLabel?: string
  busy?: boolean
  busyLabel: string
  onDownload?: () => void
  onAlt?: () => void
  error?: string
}

export interface ReportTemplateData {
  locale: 'en' | 'ar'
  strings: TemplateStrings
  // the six RIASEC types, fixed order R, I, A, S, E, C
  riasec: TemplateScore[]
  // best match first
  careers: TemplateCareer[]
  download: TemplateDownload
  // admin preview: links go nowhere
  preview?: boolean
}
