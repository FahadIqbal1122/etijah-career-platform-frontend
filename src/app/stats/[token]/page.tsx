import DashboardStatsView, { type DashboardStats } from '@/components/admin/DashboardStatsView'
import Logomark from '@/components/brand/Logomark'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export default async function PublicDashboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const res = await fetch(`${BACKEND}/public/dashboard-stats?token=${encodeURIComponent(token)}`, { cache: 'no-store' })

  if (!res.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-400 text-sm">This link is invalid or has expired.</p>
      </div>
    )
  }

  const stats: DashboardStats = await res.json()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3">
          <Logomark size={28} />
          <p className="text-sm font-semibold text-slate-700">Etijahi — Dashboard</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <DashboardStatsView stats={stats} />
      </div>
    </div>
  )
}
