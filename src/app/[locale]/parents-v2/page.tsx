import type { Metadata } from 'next'
import ParentsPage from '@/components/landing/ParentsPage'

// New parent campaign page (copy from the "Etijahi Parent Campaign" doc). A preview route for now: the live ad page is still
// /parents. Once a parent can pay first and receive the child's link, point /parents at this component. Kept out of search
// results; ad platforms can still open it.
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default function Page() {
  return <ParentsPage />
}
