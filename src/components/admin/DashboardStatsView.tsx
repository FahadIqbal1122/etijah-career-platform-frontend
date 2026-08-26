export type DashboardStats = {
  waitlist_signups: { total: number; today: number; this_week: number }
  assessment_responses: { total: number; completed: number }
  feedback_responses: number
  applications: number
  paid_plans: number
  courses: number
  country_profiles: number
  waitlist_page: { page_views: number; clicks: number; top_clicks: { label: string; count: number }[] }
  waitlist_age_breakdown: { label: string; count: number; pct: number }[]
}

export default function DashboardStatsView({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <p className="text-sm font-medium text-slate-500">Waitlist signups</p>
        <p className="text-5xl font-semibold text-slate-800 mt-1">{stats.waitlist_signups.total.toLocaleString()}</p>
        <div className="flex gap-6 mt-3 text-sm text-slate-500">
          <span><span className="font-semibold text-slate-700">{stats.waitlist_signups.today.toLocaleString()}</span> today</span>
          <span><span className="font-semibold text-slate-700">{stats.waitlist_signups.this_week.toLocaleString()}</span> last 7 days</span>
        </div>
      </div>

      {stats.waitlist_age_breakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <p className="text-sm font-medium text-slate-500 mb-3">Waitlist age groups</p>
          <div className="space-y-2">
            {stats.waitlist_age_breakdown.map((a) => (
              <div key={a.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{a.label}</span>
                  <span className="font-medium text-slate-800">{a.pct}% <span className="text-slate-400">({a.count})</span></span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: `${a.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <p className="text-sm font-medium text-slate-500 mb-3">Waitlist page activity</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-semibold text-slate-800">{stats.waitlist_page.page_views.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">Page views</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-800">{stats.waitlist_page.clicks.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">Clicks</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-800">
              {stats.waitlist_page.page_views > 0
                ? `${((stats.waitlist_signups.total / stats.waitlist_page.page_views) * 100).toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">View → signup rate</p>
          </div>
        </div>
        {stats.waitlist_page.top_clicks.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Most-clicked elements</p>
            <div className="space-y-1.5">
              {stats.waitlist_page.top_clicks.map((c) => (
                <div key={c.label} className="flex justify-between text-sm">
                  <span className="text-slate-600">{c.label}</span>
                  <span className="font-medium text-slate-800">{c.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessments started</p>
          <p className="text-3xl font-semibold text-slate-800 mt-1">{stats.assessment_responses.total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessments completed</p>
          <p className="text-3xl font-semibold text-slate-800 mt-1">{stats.assessment_responses.completed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Feedback responses</p>
          <p className="text-3xl font-semibold text-slate-800 mt-1">{stats.feedback_responses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Job applications</p>
          <p className="text-3xl font-semibold text-slate-800 mt-1">{stats.applications.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid plans</p>
          <p className="text-3xl font-semibold text-slate-800 mt-1">{stats.paid_plans.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Courses</p>
          <p className="text-3xl font-semibold text-slate-800 mt-1">{stats.courses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Country profiles</p>
          <p className="text-3xl font-semibold text-slate-800 mt-1">{stats.country_profiles.toLocaleString()}</p>
        </div>
      </div>
    </>
  )
}
