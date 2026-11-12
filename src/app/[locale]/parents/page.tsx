import type { Metadata } from 'next'
import Landing from '@/components/landing/Landing'
import ParentsPage from '@/components/landing/ParentsPage'

// Ad landing page (see src/data/landingVariants.ts). Always the marketing landing, whatever the admin homepage toggle
// says. Kept out of search results so it does not compete with the main page; ad platforms can still open it.
export const metadata: Metadata = { robots: { index: false, follow: true } }

// The new parent page (parent pays first, then shares a link with the child) replaces the old ad page when NEXT_PUBLIC_PARENT_PAY=1,
// the same switch that turns its pay buttons on. Until then the old page stays, so ad traffic never lands on disabled buttons.
// Testers can open the new page before the switch is on with ?pay=1 (the page then turns its own buy buttons on for them).
export default async function Page({ searchParams }: { searchParams: Promise<{ pay?: string | string[] }> }) {
  const { pay } = await searchParams
  const tester = pay === '1'
  return process.env.NEXT_PUBLIC_PARENT_PAY === '1' || tester ? <ParentsPage /> : <Landing variant="parents" />
}
