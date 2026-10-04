import { cookies } from 'next/headers'
import AssessmentForm from '@/components/AssessmentForm'
import BetaClosed from '@/components/BetaClosed'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

// While the beta is closed (Admin → Settings → Beta) only browsers carrying the tester
// preview cookie get the form; everyone else sees the closed page. Fails open on errors.
async function betaAllowed(): Promise<boolean> {
  try {
    const preview = (await cookies()).get('beta_preview')?.value
    const res = await fetch(`${BACKEND}/beta-status`, {
      cache: 'no-store',
      headers: preview ? { 'X-Beta-Preview': preview } : {},
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return true
    return (await res.json()).allowed !== false
  } catch {
    return true
  }
}

// Immersive full-screen assessment — deliberately outside the (main) route
// group so it renders without the site Header/Footer.
export default async function AssessmentPage() {
  if (!(await betaAllowed())) return <BetaClosed />
  return <AssessmentForm />
}
