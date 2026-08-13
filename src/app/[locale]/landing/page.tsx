import { redirect } from 'next/navigation'
import Landing from '@/components/landing/Landing'
import { getHomepageMode } from '@/lib/homepageMode'

// Only reachable while the admin homepage toggle is set to "landing" — otherwise
// redirects to "/" (which is serving the waitlist) so the two pages don't both
// stay publicly browsable at once.
export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, mode] = await Promise.all([params, getHomepageMode()])
  if (mode !== 'landing') redirect(`/${locale}`)
  return <Landing />
}
