// Campaign landing-page variants served at /start/<variant>. Same layout and
// assessment flow as the main landing page — only the hero headline and first
// paragraph differ. Any field left undefined falls back to the default copy in
// src/data/landing.ts, so a variant can be filled in one piece at a time.
//
// `headline` is [line 1, line 2]; `hl` is the phrase inside line 2 shown in teal.

export const VARIANT_SLUGS = ['majors', 'career-change', 'coach'] as const
export type VariantSlug = (typeof VARIANT_SLUGS)[number]

export interface HeroOverride {
  headline?: [string, string]
  hl?: string
  sub?: string
}

export const LANDING_VARIANTS: Record<VariantSlug, Record<'en' | 'ar', HeroOverride>> = {
  // TODO: paste the supplied copy for each variant (Arabic + English).
  majors: { en: {}, ar: {} },
  'career-change': { en: {}, ar: {} },
  coach: { en: {}, ar: {} },
}
