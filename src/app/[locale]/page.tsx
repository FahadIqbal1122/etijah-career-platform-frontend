import Landing from '@/components/landing/Landing'
// import Waitlist from '@/components/waitlist/Waitlist'
// import { getHomepageMode } from '@/lib/homepageMode'

// Locale home = the Etijahi marketing landing. The pre-launch waitlist page was removed for launch
// (previous admin-toggle logic kept below, commented out).
// export default async function Home() {
//   const mode = await getHomepageMode()
//   return mode === 'waitlist' ? <Waitlist /> : <Landing />
// }
export default function Home() {
  return <Landing />
}
