import { notFound } from 'next/navigation'
import Landing from '@/components/landing/Landing'
import { VARIANT_SLUGS, type VariantSlug } from '@/data/landingVariants'

// Campaign entry points (/start/majors, /start/career-change, /start/coach).
// Always renders the marketing landing — deliberately independent of the admin
// homepage toggle (landing vs waitlist), so paid traffic never hits the waitlist.
export function generateStaticParams() {
  return VARIANT_SLUGS.map((variant) => ({ variant }))
}

export default async function StartVariantPage({ params }: { params: Promise<{ locale: string; variant: string }> }) {
  const { variant } = await params
  if (!(VARIANT_SLUGS as readonly string[]).includes(variant)) notFound()
  return <Landing variant={variant as VariantSlug} />
}
