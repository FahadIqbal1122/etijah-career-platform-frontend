import type { Metadata } from 'next'
import Landing from '@/components/landing/Landing'

// Ad landing page (see src/data/landingVariants.ts). Always the marketing landing, whatever the admin homepage toggle
// says. Kept out of search results so it does not compete with the main page; ad platforms can still open it.
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default function Page() {
  return <Landing variant="career-changer" />
}
