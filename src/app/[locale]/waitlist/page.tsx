import { redirect } from 'next/navigation'
import Waitlist from '@/components/waitlist/Waitlist'
import { getHomepageMode } from '@/lib/homepageMode'

// Only reachable while the admin homepage toggle is set to "waitlist" — otherwise
// redirects to "/" (which is serving the landing page) so the two pages don't both
// stay publicly browsable at once.
export default async function WaitlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, mode] = await Promise.all([params, getHomepageMode()])
  if (mode !== 'waitlist') redirect(`/${locale}`)
  return <Waitlist />
}
