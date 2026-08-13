import Landing from '@/components/landing/Landing'
import Waitlist from '@/components/waitlist/Waitlist'
import { getHomepageMode } from '@/lib/homepageMode'

// Locale home = either the Etijahi marketing landing or the pre-launch waitlist,
// toggleable from the admin dashboard. Whichever one is inactive redirects here
// from its own route (see [locale]/landing and [locale]/waitlist), so only one
// page is ever publicly reachable at a time. Both carry their own nav + footer,
// so this sits outside the (main) route group (which supplies the site chrome for
// dashboard/results/login/signup). The assessment lives at /[locale]/assessment.
export default async function Home() {
  const mode = await getHomepageMode()
  return mode === 'waitlist' ? <Waitlist /> : <Landing />
}
