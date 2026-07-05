import Landing from '@/components/landing/Landing'

// Locale home = the Etijahi marketing landing. It carries its own nav + footer,
// so it sits outside the (main) route group (which supplies the site chrome for
// dashboard/results/login/signup). The assessment lives at /[locale]/assessment.
export default function Home() {
  return <Landing />
}
