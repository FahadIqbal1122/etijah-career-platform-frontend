'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { apiGet, apiAuthPost } from '@/lib/api'
import { CopyLinkButton } from '@/components/CopyLinkButton'
import { Link } from '@/i18n/navigation'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'

const levelToWidth: Record<string, string> = {
  low: '20%',
  'low-moderate': '38%',
  moderate: '52%',
  'moderate-high': '68%',
  high: '88%',
}

// Brand section header (teal icon tile + title/subtitle) used across the report.
function SectionHead({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-lightblue flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-charcoal text-sm">{title}</h3>
        <p className="text-xs text-charcoal/45">{subtitle}</p>
      </div>
    </div>
  )
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-lightblue shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-lightblue rounded w-1/3" />
          <div className="h-3 bg-lightblue rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 bg-lightblue rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const params = useParams()
  const id = params.id as string

  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [aiImpact, setAiImpact] = useState<any>(null)
  const [jobListings, setJobListings] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [courses, setCourses] = useState<any[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [savedJobs, setSavedJobs] = useState<Set<number>>(new Set())
  const [saveError, setSaveError] = useState('')
  const [email, setEmail] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  useEffect(() => {
    apiGet<any>(`/assessment/${id}/results`)
      .then(data => {
        setSummary(data.summary)
        setEmail(data.email || '')
      })
      .catch(err => setError(err.message || 'Failed to load results'))
    apiGet<any>(`/assessment/${id}/career-suggestions`)
      .then(data => setJobs(data.suggestions))
      .catch(() => {})
    apiGet<any>(`/assessment/${id}/ai-impact`)
      .then(data => setAiImpact(data))
      .catch(() => {})
      .finally(() => setAiLoading(false))
    apiGet<any>(`/assessment/${id}/job-listings`)
      .then(data => setJobListings(data.jobs || []))
      .catch(() => {})
      .finally(() => setJobsLoading(false))
    apiGet<any[]>(`/assessment/${id}/companies`)
      .then(data => setCompanies(data || []))
      .catch(() => {})
      .finally(() => setCompaniesLoading(false))
    apiGet<any[]>(`/assessment/${id}/courses`)
      .then(data => setCourses(data || []))
      .catch(() => {})
      .finally(() => setCoursesLoading(false))
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <p className="text-rose-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-charcoal/40 text-sm">Loading your results…</p>
        </div>
      </div>
    )
  }

  async function saveJob(job: any, index: number) {
    try {
      await apiAuthPost('/applications', {
        response_id: id,
        job_title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        url: job.url,
        matched_career: job.matched_career,
      })
      setSavedJobs(prev => new Set(prev).add(index))
    } catch {
      setSaveError('Sign in to save jobs to your tracker')
    }
  }

  const topType = summary.riasec.top_types[0]
  const riasecCode = summary.riasec.top_types.map((t: string) => t[0].toUpperCase()).join('')

  return (
    <div className="min-h-screen brand-surface">

      {/* Hero */}
      <div className="brand-hero px-4 pt-10 pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-4 left-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute bottom-0 right-4 w-48 h-48 rounded-full bg-teal" />
        </div>
        <div className="relative">
          <div className="flex justify-center mb-5"><Logomark size={44} tone="dark" glow /></div>
          <p className="eyebrow !text-white/70 mb-3">Career Assessment Results</p>
          <h1 className="text-3xl font-extrabold mb-2">Your Career Profile</h1>
          <p className="text-white/70 text-sm mb-6 max-w-xs mx-auto">Personalised breakdown based on your responses</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-semibold capitalize">
              {topType} type
            </span>
            <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-semibold">
              RIASEC: {riasecCode}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 pb-16 space-y-4 relative z-10">

        {/* Signup CTA */}
        {!loggedIn && (
          <div className="card p-5 flex items-center justify-between gap-4 flex-wrap border-l-4 border-l-teal">
            <div>
              <p className="text-sm font-bold text-charcoal">Save your results &amp; track job applications</p>
              <p className="text-xs text-charcoal/50 mt-0.5">Create a free account to keep this report and use the job tracker</p>
            </div>
            <Link
              href={{ pathname: '/signup', query: email ? { email } : {} }}
              className="cta shrink-0"
              style={{ padding: '10px 18px', fontSize: 14, borderRadius: 12 }}
            >
              Create account
            </Link>
          </div>
        )}

        {/* Top 3 quick cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Career Type', value: summary.riasec.top_types[0] },
            { label: 'Top Value', value: summary.values.top_values[0] },
            { label: 'Top Strength', value: summary.strengths.top_strengths[0] },
          ].map(({ label, value }) => (
            <div key={label} className="card p-5 text-center">
              <p className="eyebrow mb-1.5">{label}</p>
              <p className="text-base font-extrabold text-charcoal capitalize">{value}</p>
            </div>
          ))}
        </div>

        {/* Career Types + Values + Strengths + Personality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Career Types */}
          <div className="card p-5">
            <SectionHead
              title="Career Types"
              subtitle="RIASEC profile"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07A2.25 2.25 0 0118 20.47H6a2.25 2.25 0 01-2.25-2.25v-4.07M15.75 9.75V6a3.75 3.75 0 00-7.5 0v3.75M3.75 9.75h16.5" /></svg>}
            />
            <div className="flex gap-2 flex-wrap">
              {summary.riasec.top_types.map((t: string, i: number) => (
                <span key={t} className={i === 0 ? 'chip chip-solid capitalize' : 'chip capitalize'}>{t}</span>
              ))}
            </div>
          </div>

          {/* Core Values */}
          <div className="card p-5">
            <SectionHead
              title="Core Values"
              subtitle="What drives you"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
            />
            <div className="flex gap-2 flex-wrap">
              {summary.values.top_values.map((v: string, i: number) => (
                <span key={v} className={i === 0 ? 'chip chip-teal capitalize font-bold' : 'chip capitalize'}>{v}</span>
              ))}
            </div>
          </div>

          {/* Top Strengths */}
          <div className="card p-5">
            <SectionHead
              title="Top Strengths"
              subtitle="Natural advantages"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}
            />
            <div className="flex gap-2 flex-wrap">
              {summary.strengths.top_strengths.map((s: string, i: number) => (
                <span key={s} className={i === 0 ? 'chip chip-solid capitalize' : 'chip capitalize'}>{s}</span>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div className="card p-5">
            <SectionHead
              title="Personality"
              subtitle="Big Five traits"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            />
            <div className="space-y-2.5">
              {Object.entries(summary.big_five).map(([trait, level]: any) => (
                <div key={trait}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-charcoal/70 capitalize">{trait.replace(/_/g, ' ')}</span>
                    <span className="chip capitalize !py-0.5 !text-[11px]">{level}</span>
                  </div>
                  <div className="w-full bg-lightblue rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-700" style={{ width: levelToWidth[level] ?? '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Work Style & Resilience */}
        {summary.work_style && (
          <div className="card p-5">
            <SectionHead
              title="Work Style & Resilience"
              subtitle="How you work best"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
            />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {[
                { label: 'Pace', low: 'Steady', high: 'Fast-paced', score: summary.work_style.pace },
                { label: 'Environment', low: 'Large org', high: 'Startup', score: summary.work_style.environment },
                { label: 'Sector', low: 'Public', high: 'Private', score: summary.work_style.sector },
                { label: 'Mobility', low: 'Local', high: 'Open to relocate', score: summary.work_style.mobility },
                ...(summary.resilience ? [
                  { label: 'Long-term focus', low: 'Short-term', high: 'Long-term', score: summary.resilience.long_term_focus },
                  { label: 'Resilience', low: 'Needs support', high: 'Bounces back', score: summary.resilience.workplace_resilience },
                ] : []),
              ].map(({ label, low, high, score }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-charcoal/50">{label}</span>
                    <span className="chip chip-teal !py-0.5 !text-[11px]">{score >= 50 ? high : low}</span>
                  </div>
                  <div className="w-full bg-lightblue rounded-full h-1.5">
                    <div className="bg-teal h-1.5 rounded-full transition-all duration-700" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Careers */}
        {jobs.length > 0 && (
          <div className="card p-5">
            <SectionHead
              title="Suggested Careers"
              subtitle="Matched across your full profile"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07A2.25 2.25 0 0118 20.47H6a2.25 2.25 0 01-2.25-2.25v-4.07M15.75 9.75V6a3.75 3.75 0 00-7.5 0v3.75M3.75 9.75h16.5" /></svg>}
            />
            <div className="grid grid-cols-2 gap-2">
              {jobs.map((job: any, i: number) => (
                <div
                  key={job.title}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold capitalize flex items-center gap-2 ${
                    i === 0 ? 'bg-primary text-white col-span-2' : 'bg-lightblue text-primary border border-[var(--line)]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-white' : 'bg-teal'}`} />
                  {job.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Job Postings */}
        {jobsLoading ? (
          <SkeletonCard rows={3} />
        ) : jobListings.length > 0 ? (
          <div className="card p-5">
            <SectionHead
              title="Live Job Postings"
              subtitle="Current openings matched to your careers"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>}
            />
            {saveError && <p className="text-xs text-rose-500 mb-2">{saveError}</p>}
            <div className="space-y-2">
              {jobListings.map((job: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3.5 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors">
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 group">
                    <p className="text-sm font-bold text-charcoal group-hover:text-primary truncate">{job.title}</p>
                    <p className="text-xs text-charcoal/50 truncate">{job.company} · {job.location}</p>
                    <p className="text-xs text-charcoal/40 mt-0.5 capitalize">for: {job.matched_career}</p>
                  </a>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="chip !py-0.5 !text-[11px]">{job.source}</span>
                    <button
                      onClick={() => saveJob(job, i)}
                      disabled={savedJobs.has(i)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        savedJobs.has(i)
                          ? 'bg-teal/10 text-teal border-teal/20'
                          : 'bg-white text-charcoal/50 border-[var(--line-strong)] hover:border-primary hover:text-primary'
                      }`}
                    >
                      {savedJobs.has(i) ? 'Saved ✓' : 'Save to tracker'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* AI Impact */}
        {aiLoading ? (
          <SkeletonCard rows={4} />
        ) : aiImpact ? (
          <div className="card p-5">
            <SectionHead
              title="AI Impact on Your Careers"
              subtitle="How automation affects your top matches"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.096.04a2.25 2.25 0 002.635-.701L19.5 9m-9.75-5.896A24.27 24.27 0 0112 3c.607 0 1.207.026 1.8.078" /></svg>}
            />
            <p className="text-sm text-charcoal/70 mb-4 leading-relaxed">{aiImpact.overall_summary}</p>
            <div className="space-y-3">
              {aiImpact.careers?.map((c: any) => (
                <div key={c.title} className="border border-[var(--line)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-charcoal">{c.title}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      c.ai_risk_level === 'low' ? 'bg-teal/10 text-teal' :
                      c.ai_risk_level === 'medium' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {c.ai_risk_level?.toUpperCase()} RISK
                    </span>
                  </div>
                  <p className="text-xs text-charcoal/50 mb-2">{c.gcc_outlook}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {c.protected_skills?.map((s: string) => (
                      <span key={s} className="chip chip-teal !py-0.5 !text-[11px]">{s}</span>
                    ))}
                  </div>
                  <ul className="space-y-1">
                    {c.upskilling?.map((tip: string) => (
                      <li key={tip} className="text-xs text-charcoal/50 flex gap-1.5">
                        <span className="text-primary mt-0.5">→</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Course Recommendations */}
        {coursesLoading ? (
          <SkeletonCard rows={3} />
        ) : courses.length > 0 ? (
          <div className="card p-5">
            <SectionHead
              title="Recommended Courses"
              subtitle="Matched to your strengths and career paths"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
            />
            <div className="space-y-2">
              {courses.map((course: any) => (
                <a
                  key={course.id}
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3.5 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-charcoal group-hover:text-primary truncate">{course.title}</p>
                    <p className="text-xs text-charcoal/50 truncate">{course.provider} · {course.level}{course.duration_hours ? ` · ${course.duration_hours}h` : ''}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 border ${course.is_free ? 'bg-teal/10 text-teal border-teal/20' : 'bg-lightblue text-primary border-[var(--line)]'}`}>
                    {course.is_free ? 'Free' : 'Paid'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Company Target List */}
        {companiesLoading ? (
          <SkeletonCard rows={3} />
        ) : companies.length > 0 ? (
          <div className="card p-5">
            <SectionHead
              title="Companies to Target"
              subtitle="Hiring in your sector and country"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {companies.map((company: any) => (
                <a
                  key={company.id}
                  href={company.career_page_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border border-[var(--line)] rounded-xl p-3 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-charcoal group-hover:text-primary truncate">{company.name_en}</p>
                    <p className="text-xs text-charcoal/50 truncate capitalize">{company.sector}{company.is_government ? ' · Government' : ''}</p>
                  </div>
                  <span className="chip !py-0.5 !text-[11px]">View</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Share */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          <p className="text-sm text-charcoal/40">Share your results</p>
          <CopyLinkButton />
        </div>

      </div>
    </div>
  )
}
