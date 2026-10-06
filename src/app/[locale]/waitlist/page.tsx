import { redirect } from 'next/navigation'

// The waitlist page was removed for launch — anyone with an old link goes to the home page.
// (Previous version rendered <Waitlist /> while the admin homepage toggle was "waitlist".)
export default async function WaitlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}`)
}
