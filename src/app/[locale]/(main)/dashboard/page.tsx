'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiAuthGet, apiAuthPatch, apiAuthDelete, BASE_URL } from '@/lib/api'
import { Link } from '@/i18n/navigation'

type Application = {
  id: string
  job_title: string
  company: string | null
  location: string | null
  source: string | null
  url: string | null
  matched_career: string | null
  status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
  notes: string | null
  applied_at: string | null
  created_at: string
}

type AssessmentSummary = {
  id: string
  full_name: string
  country: string
  completed: boolean
  created_at: string
  top_type: string | null
}

const STAGES: { key: Application['status']; label: string }[] = [
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [appsLoading, setAppsLoading] = useState(true)
  const [error, setError] = useState('')
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'assessments' | 'jobs'>('assessments')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/en/login')
        return
      }
      setUser(session.user)
      setLoading(false)
    })
  }, [router])

  useEffect(() => {
    if (!user) return
    apiAuthGet<Application[]>('/applications')
      .then(setApplications)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load applications'))
      .finally(() => setAppsLoading(false))
    apiAuthGet<AssessmentSummary[]>('/assessment/my-assessments')
      .then(setAssessments)
      .catch(() => {})
      .finally(() => setAssessmentsLoading(false))
  }, [user])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/en/login')
  }

  async function moveStage(id: string, status: Application['status']) {
    try {
      const updated = await apiAuthPatch<Application>(`/applications/${id}`, { status })
      setApplications(prev => prev.map(a => (a.id === id ? updated : a)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update application')
    }
  }

  async function removeApplication(id: string) {
    try {
      await apiAuthDelete(`/applications/${id}`)
      setApplications(prev => prev.filter(a => a.id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove application')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-800">My Dashboard</h1>
          <p className="text-xs text-slate-400">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Sign out
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <div className="w-56 shrink-0 hidden sm:block">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('assessments')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'assessments' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Assessment Results
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'jobs' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Job Tracker
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
        {activeTab === 'assessments' && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">My Assessment Results</h2>
          <p className="text-sm text-slate-400 mb-4">View your full report or download a PDF copy.</p>

          {assessmentsLoading ? (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-20" />
          ) : assessments.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
              <p className="text-slate-500 text-sm">No linked assessments yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map(a => (
                <div key={a.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{a.full_name}</p>
                      {a.top_type && (
                        <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full capitalize">
                          {a.top_type} type
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString()} · {a.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/results/${a.id}`}
                      className="text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                    >
                      View Results
                    </Link>
                    <a
                      href={`${BASE_URL}/assessment/${a.id}/report`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                    >
                      Download Report
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {activeTab === 'jobs' && (
        <>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Job Application Tracker</h2>
            <p className="text-sm text-slate-400">Track jobs you&apos;ve saved from your results, through to offer.</p>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {appsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STAGES.map(s => (
              <div key={s.key} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-40" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
            <p className="text-slate-500 text-sm">No saved jobs yet. Jobs you save from your results page will show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STAGES.map(stage => {
              const stageApps = applications.filter(a => a.status === stage.key)
              return (
                <div key={stage.key} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 text-sm">{stage.label}</h3>
                    <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{stageApps.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {stageApps.map(app => (
                      <div key={app.id} className="border border-slate-100 rounded-xl p-3 hover:border-blue-200 transition-colors">
                        <p className="text-sm font-semibold text-slate-800 truncate">{app.job_title}</p>
                        <p className="text-xs text-slate-500 truncate">{app.company}{app.location ? ` · ${app.location}` : ''}</p>
                        {app.url && (
                          <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            View posting
                          </a>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <select
                            value={app.status}
                            onChange={e => moveStage(app.id, e.target.value as Application['status'])}
                            className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 flex-1"
                          >
                            {STAGES.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeApplication(app.id)}
                            className="text-xs text-slate-400 hover:text-red-500"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </>
        )}
        </div>
      </div>
    </div>
  )
}
