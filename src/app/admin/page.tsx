'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const levelToWidth: Record<string, string> = {
  low: '20%',
  'low-moderate': '38%',
  moderate: '52%',
  'moderate-high': '68%',
  high: '88%',
}

type Submission = {
  id: string
  full_name: string
  email: string
  phone: string
  country: string
  age_bracket: string
  current_stage: string
  completed: boolean
  created_at: string
}

type OnetLink = {
  id: string
  email: string
  onet_url: string
  label: string | null
  created_at: string
  has_assessment: boolean
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [adminKey, setAdminKey] = useState('')

  const [activeTab, setActiveTab] = useState<'submissions' | 'onet'>('submissions')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [selected, setSelected] = useState<Submission | null>(null)
  const [results, setResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [onetLinks, setOnetLinks] = useState<OnetLink[]>([])
  const [onetLoading, setOnetLoading] = useState(false)
  const [onetError, setOnetError] = useState('')
  const [onetEmail, setOnetEmail] = useState('')
  const [onetUrl, setOnetUrl] = useState('')
  const [onetLabel, setOnetLabel] = useState('')
  const [onetAdding, setOnetAdding] = useState(false)
  const [selectedOnet, setSelectedOnet] = useState<OnetLink | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAdminKey(session.access_token)
        setAuthed(true)
      }
    })
  }, [])

  const fetchSubmissions = useCallback(async (key: string) => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/admin/submissions', {
        headers: { 'x-auth-token': key },
      })
      if (!res.ok) throw new Error('Failed to load submissions')
      setSubmissions(await res.json())
    } catch (err: any) {
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOnetLinks = useCallback(async (key: string) => {
    setOnetLoading(true)
    setOnetError('')
    try {
      const res = await fetch('/api/admin/onet', {
        headers: { 'x-auth-token': key },
      })
      if (!res.ok) throw new Error('Failed to load O*NET links')
      setOnetLinks(await res.json())
    } catch (err: any) {
      setOnetError(err.message)
    } finally {
      setOnetLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed && adminKey) {
      fetchSubmissions(adminKey)
      fetchOnetLinks(adminKey)
    }
  }, [authed, adminKey, fetchSubmissions, fetchOnetLinks])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.session) {
        setLoginError('Invalid credentials')
        return
      }
      if (data.user.app_metadata?.role !== 'admin') {
        await supabase.auth.signOut()
        setLoginError('Not authorized as admin')
        return
      }
      setAdminKey(data.session.access_token)
      setAuthed(true)
    } catch {
      setLoginError('Connection error, please try again')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setAuthed(false)
    setAdminKey('')
    setSubmissions([])
    setSelected(null)
    setResults(null)
    setOnetLinks([])
    setSelectedOnet(null)
  }

  async function handleViewResults(sub: Submission) {
    setSelected(sub)
    setResults(null)
    setResultsLoading(true)
    try {
      const res = await fetch(`/api/admin/submissions/${sub.id}/results`, {
        headers: { 'x-auth-token': adminKey },
      })
      const data = await res.json()
      setResults(data.summary)
    } catch {
      setResults(null)
    } finally {
      setResultsLoading(false)
    }
  }

  async function handleDeleteSubmission(id: string) {
    if (!confirm('Delete this submission and all its data?')) return
    await fetch(`/api/admin/submissions/${id}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': adminKey },
    })
    setSubmissions(prev => prev.filter(s => s.id !== id))
  }

  async function handleAddOnet(e: React.FormEvent) {
    e.preventDefault()
    setOnetAdding(true)
    try {
      const res = await fetch('/api/admin/onet', {
        method: 'POST',
        headers: { 'x-auth-token': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: onetEmail, onet_url: onetUrl, label: onetLabel || null }),
      })
      if (!res.ok) throw new Error('Failed to add')
      setOnetEmail('')
      setOnetUrl('')
      setOnetLabel('')
      await fetchOnetLinks(adminKey)
    } catch (err: any) {
      setOnetError(err.message)
    } finally {
      setOnetAdding(false)
    }
  }

  async function handleDeleteOnet(id: string) {
    try {
      await fetch(`/api/admin/onet/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': adminKey },
      })
      setOnetLinks(prev => prev.filter(l => l.id !== id))
      if (selectedOnet?.id === id) setSelectedOnet(null)
    } catch {
       // silent
    }
  }

  const onetLinkForEmail = (email: string) =>
    onetLinks.find(l => l.email.toLowerCase() === email?.toLowerCase())

  // ── Login ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Admin Panel</h1>
          <p className="text-sm text-slate-400 mb-6">Etijah Career Compass</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loggingIn && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Results detail panel ──────────────────────────────
  if (selected) {
    const onet = onetLinkForEmail(selected.email)
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setSelected(null); setResults(null) }}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              ← Back
            </button>
            <div>
              <h2 className="font-semibold text-slate-800">{selected.full_name}</h2>
              <p className="text-xs text-slate-400">{selected.email} · {selected.id}</p>
            </div>
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/en/results/${selected.id}`
              navigator.clipboard.writeText(url)
              setLinkCopied(true)
              if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
              copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000)
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
              linkCopied
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300'
            }`}
          >
            {linkCopied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 10h6a2 2 0 002-2v-8a2 2 0 00-2-2h-6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Results Link
              </>
            )}
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Profile</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Name', selected.full_name],
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['Country', selected.country],
                ['Age bracket', selected.age_bracket],
                ['Current stage', selected.current_stage],
                ['Submitted', new Date(selected.created_at).toLocaleString()],
                ['Completed', selected.completed ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {onet && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-orange-700 mb-2 text-sm uppercase tracking-wide">O*NET Assessment</h3>
              {onet.label && <p className="text-xs text-orange-500 mb-2">{onet.label}</p>}
              <a
                href={onet.onet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:underline break-all"
              >
                {onet.onet_url}
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {resultsLoading && (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {results && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Career Types (RIASEC)</h3>
                <div className="flex gap-2 flex-wrap">
                  {results.riasec.top_types.map((t: string, i: number) => (
                    <span key={t} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>{t}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Core Values</h3>
                <div className="flex gap-2 flex-wrap">
                  {results.values.top_values.map((v: string, i: number) => (
                    <span key={v} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>{v}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Top Strengths</h3>
                <div className="flex gap-2 flex-wrap">
                  {results.strengths.top_strengths.map((s: string, i: number) => (
                    <span key={s} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>{s}</span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-5 text-sm uppercase tracking-wide">Personality (Big Five)</h3>
                <div className="space-y-4">
                  {Object.entries(results.big_five).map(([trait, level]: any) => (
                    <div key={trait}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-slate-700 capitalize">{trait.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full capitalize">{level}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: levelToWidth[level] ?? '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── O*NET detail panel ────────────────────────────────
  if (selectedOnet) {
    const matchedSubmission = submissions.find(
      s => s.email?.toLowerCase() === selectedOnet.email.toLowerCase()
    )
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSelectedOnet(null)}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Back
          </button>
          <div>
            <h2 className="font-semibold text-slate-800">{selectedOnet.email}</h2>
            {selectedOnet.label && <p className="text-xs text-slate-400">{selectedOnet.label}</p>}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-orange-700 mb-2 text-sm uppercase tracking-wide">O*NET Link</h3>
            <a
              href={selectedOnet.onet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:underline break-all"
            >
              {selectedOnet.onet_url}
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {matchedSubmission ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Matched Assessment</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                {[
                  ['Name', matchedSubmission.full_name],
                  ['Email', matchedSubmission.email],
                  ['Country', matchedSubmission.country],
                  ['Stage', matchedSubmission.current_stage?.replace(/_/g, ' ')],
                  ['Submitted', new Date(matchedSubmission.created_at).toLocaleString()],
                  ['Completed', matchedSubmission.completed ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="text-slate-800 font-medium capitalize">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
              <button
                onClick={() => { setSelectedOnet(null); handleViewResults(matchedSubmission) }}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                View full assessment results →
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
              <p className="text-slate-400 text-sm">No assessment submitted yet for this email.</p>
              <p className="text-slate-300 text-xs mt-1">Results will appear here once they complete the assessment.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main panel ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="font-bold text-slate-800">Admin Panel</h1>
            <p className="text-xs text-slate-400">Etijah Career Compass</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'submissions' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Submissions
            </button>
            <button
              onClick={() => setActiveTab('onet')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'onet' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              O*NET Links
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { fetchSubmissions(adminKey); fetchOnetLinks(adminKey) }}
            className="text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Submissions Tab ── */}
        {activeTab === 'submissions' && (
          <>
            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {fetchError && <p className="text-red-500 text-sm text-center py-8">{fetchError}</p>}
            {!loading && !fetchError && (
              <>
                <p className="text-sm text-slate-400 mb-4">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub, i) => {
                        const hasOnet = !!onetLinkForEmail(sub.email)
                        return (
                          <tr key={sub.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              <span>{sub.full_name || '—'}</span>
                              {hasOnet && (
                                <span className="ml-2 text-xs font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">O*NET</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{sub.email || '—'}</td>
                            <td className="px-4 py-3 text-slate-500">{sub.country || '—'}</td>
                            <td className="px-4 py-3 text-slate-500 capitalize">{sub.current_stage?.replace(/_/g, ' ') || '—'}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{new Date(sub.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.completed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                                {sub.completed ? 'Complete' : 'Incomplete'}
                              </span>
                            </td>
                            <td className="px-4 py-3 flex items-center gap-3">
                              <button
                                onClick={() => handleViewResults(sub)}
                                className="text-xs text-blue-600 hover:underline font-medium"
                              >
                                View results →
                              </button>
                              <button
                                onClick={() => handleDeleteSubmission(sub.id)}
                                className="text-xs text-red-400 hover:text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {submissions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No submissions yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── O*NET Tab ── */}
        {activeTab === 'onet' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Add O*NET Link</h2>
              <form onSubmit={handleAddOnet} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={onetEmail}
                    onChange={e => setOnetEmail(e.target.value)}
                    placeholder="user@email.com"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex-[2] min-w-[220px]">
                  <label className="block text-xs text-slate-500 mb-1">O*NET URL</label>
                  <input
                    type="url"
                    required
                    value={onetUrl}
                    onChange={e => setOnetUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-slate-500 mb-1">Label (optional)</label>
                  <input
                    type="text"
                    value={onetLabel}
                    onChange={e => setOnetLabel(e.target.value)}
                    placeholder="e.g. May 2026"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={onetAdding}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {onetAdding && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Add
                </button>
              </form>
              {onetError && <p className="text-red-500 text-xs mt-2">{onetError}</p>}
            </div>

            {onetLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!onetLoading && (
              <>
                <p className="text-sm text-slate-400 mb-4">{onetLinks.length} link{onetLinks.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">O*NET URL</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessment</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Added</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {onetLinks.map((link, i) => (
                        <tr key={link.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{link.email}</td>
                          <td className="px-4 py-3 text-slate-500">{link.label || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                            <a href={link.onet_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                              {link.onet_url}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${link.has_assessment ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                              {link.has_assessment ? 'Submitted' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(link.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 flex items-center gap-3">
                            <button
                              onClick={() => setSelectedOnet(link)}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              View →
                            </button>
                            <button
                              onClick={() => handleDeleteOnet(link.id)}
                              className="text-xs text-red-400 hover:text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {onetLinks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No O*NET links added yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
