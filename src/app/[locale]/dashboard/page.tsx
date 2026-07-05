import UserDashboard from '@/components/dashboard/UserDashboard'

// Immersive user dashboard (own sidebar app-shell) — sits outside the (main)
// route group so it renders without the site Header/Footer, matching the design.
export default function DashboardPage() {
  return <UserDashboard />
}
