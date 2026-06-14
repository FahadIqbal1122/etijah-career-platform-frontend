'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiGet } from '@/lib/api'
import { CopyLinkButton } from '@/components/CopyLinkButton'

const levelToWidth: Record<string, string> = {
  low: '20%',
  'low-moderate': '38%',
  moderate: '52%',
  'moderate-high': '68%',
  high: '88%',
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl" />
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

  useEffect(() => {
    apiGet<any>(`/assessment/${id}/results`)
      .then(data => setSummary(data.summary))
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
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading your results…</p>
        </div>
      </div>
    )
  }

  const topType = summary.riasec.top_types[0]
  const riasecCode = summary.riasec.top_types.map((t: string) => t[0].toUpperCase()).join('')

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4 pt-10 pb-16 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute bottom-0 right-4 w-48 h-48 rounded-full bg-indigo-300" />
        </div>
        <div className="relative">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-3">Career Assessment Results</p>
          <h1 className="text-3xl font-bold mb-2">Your Career Profile</h1>
          <p className="text-blue-200 text-sm mb-6 max-w-xs mx-auto">Personalised breakdown based on your responses</p>
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

        {/* Top 3 quick cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Career Type', value: summary.riasec.top_types[0], color: 'blue' },
            { label: 'Top Value', value: summary.values.top_values[0], color: 'amber' },
            { label: 'Top Strength', value: summary.strengths.top_strengths[0], color: 'purple' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center`}>
              <p className={`text-xs font-medium text-${color}-500 mb-1.5`}>{label}</p>
              <p className="text-base font-bold text-slate-800 capitalize">{value}</p>
            </div>
          ))}
        </div>

        {/* Career Types + Values + Strengths — responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">

          {/* Career Types */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07A2.25 2.25 0 0118 20.47H6a2.25 2.25 0 01-2.25-2.25v-4.07M15.75 9.75V6a3.75 3.75 0 00-7.5 0v3.75M3.75 9.75h16.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Career Types</h3>
                <p className="text-xs text-slate-400">RIASEC profile</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {summary.riasec.top_types.map((t: string, i: number) => (
                <span key={t} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${i === 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Core Values */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Core Values</h3>
                <p className="text-xs text-slate-400">What drives you</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {summary.values.top_values.map((v: string, i: number) => (
                <span key={v} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${i === 0 ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Top Strengths */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Top Strengths</h3>
                <p className="text-xs text-slate-400">Natural advantages</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {summary.strengths.top_strengths.map((s: string, i: number) => (
                <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${i === 0 ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Personality</h3>
                <p className="text-xs text-slate-400">Big Five traits</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {Object.entries(summary.big_five).map(([trait, level]: any) => (
                <div key={trait}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-600 capitalize">{trait.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">{level}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700" style={{ width: levelToWidth[level] ?? '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Work Style & Resilience */}
        {summary.work_style && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Work Style & Resilience</h3>
                <p className="text-xs text-slate-400">How you work best</p>
              </div>
            </div>
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
                    <span className="text-xs font-medium text-slate-500">{label}</span>
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{score >= 50 ? high : low}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Careers */}
        {jobs.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07A2.25 2.25 0 0118 20.47H6a2.25 2.25 0 01-2.25-2.25v-4.07M15.75 9.75V6a3.75 3.75 0 00-7.5 0v3.75M3.75 9.75h16.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Suggested Careers</h3>
                <p className="text-xs text-slate-400">Matched across your full profile</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {jobs.map((job: any, i: number) => (
                <div key={job.title} className={`rounded-xl px-3 py-2.5 text-xs font-medium capitalize flex items-center gap-2 ${i === 0 ? 'bg-green-600 text-white col-span-2' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-white' : 'bg-green-400'}`} />
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Live Job Postings</h3>
                <p className="text-xs text-slate-400">Current openings matched to your careers</p>
              </div>
            </div>
            <div className="space-y-2">
              {jobListings.map((job: any, i: number) => (
                <a
                  key={i}
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 border border-slate-100 rounded-xl p-3.5 hover:border-sky-200 hover:bg-sky-50/40 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-sky-700 truncate">{job.title}</p>
                    <p className="text-xs text-slate-500 truncate">{job.company} · {job.location}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">for: {job.matched_career}</p>
                  </div>
                  <span className="text-xs font-medium bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full shrink-0 mt-0.5">{job.source}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* AI Impact */}
        {aiLoading ? (
          <SkeletonCard rows={4} />
        ) : aiImpact ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.096.04a2.25 2.25 0 002.635-.701L19.5 9m-9.75-5.896A24.27 24.27 0 0112 3c.607 0 1.207.026 1.8.078" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">AI Impact on Your Careers</h3>
                <p className="text-xs text-slate-400">How automation affects your top matches</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">{aiImpact.overall_summary}</p>
            <div className="space-y-3">
              {aiImpact.careers?.map((c: any) => (
                <div key={c.title} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">{c.title}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      c.ai_risk_level === 'low'    ? 'bg-green-50 text-green-700' :
                      c.ai_risk_level === 'medium' ? 'bg-amber-50 text-amber-700' :
                                                     'bg-rose-50 text-rose-700'
                    }`}>
                      {c.ai_risk_level?.toUpperCase()} RISK
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{c.gcc_outlook}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {c.protected_skills?.map((s: string) => (
                      <span key={s} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <ul className="space-y-1">
                    {c.upskilling?.map((tip: string) => (
                      <li key={tip} className="text-xs text-slate-500 flex gap-1.5">
                        <span className="text-blue-400 mt-0.5">→</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Share */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          <p className="text-sm text-slate-400">Share your results</p>
          <CopyLinkButton />
        </div>

      </div>
    </div>
  )
}
