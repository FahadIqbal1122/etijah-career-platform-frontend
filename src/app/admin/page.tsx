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

// O*NET Interest Profiler share-code decoder.
// The 5-char code in /s/scores/<code> encodes all 6 RIASEC scores using a
// base-41 alphabet. Each score is 0-20. Extracted from onetinterestprofiler.org
// bundle — no network call needed.
const ONET_IV = 'hCxDrnvJVB3StXLqg54Gpj7QkPzZ69scHRKTNbfFd'

function decodeOnetUrl(url: string): Record<string, number> | null {
  try {
    const match = new URL(url).pathname.match(/\/s\/scores\/([A-Za-z0-9]{5})$/)
    if (!match) return null
    const idx = match[1].split('').map(c => ONET_IV.indexOf(c))
    if (idx.includes(-1)) return null
    const e = idx[0] * 2825761 + idx[1] * 68921 + idx[2] * 1681 + idx[3] * 41 + idx[4]
    if (Math.floor(e / 4084101) > 20) return null
    return {
      realistic:     Math.floor(e / 4084101),
      investigative: Math.floor(e / 194481) % 21,
      artistic:      Math.floor(e / 9261)   % 21,
      social:        Math.floor(e / 441)    % 21,
      enterprising:  Math.floor(e / 21)     % 21,
      conventional:  e % 21,
    }
  } catch { return null }
}

function topRiasecTypes(scores: Record<string, number>, n = 3): string[] {
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)
}

function riasecAgreement(ours: string[], onet: string[]) {
  const matching = ours.filter(t => onet.includes(t))
  const onlyOurs = ours.filter(t => !onet.includes(t))
  const onlyOnet = onet.filter(t => !ours.includes(t))
  const score    = Math.round(matching.length / Math.max(ours.length, onet.length, 1) * 100)
  const verdict  =
    score >= 90 ? 'Both assessments strongly agree — high confidence in this career profile.' :
    score >= 60 ? 'Good alignment between the two assessments — results are broadly consistent.' :
    score >= 34 ? 'Partial agreement — the assessments highlight different facets of the profile.' :
                  'Results diverge — worth discussing both with a career coach for deeper insight.'
  return { matching, onlyOurs, onlyOnet, score, verdict }
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

type FeedbackEntry = {
  id: string
  fname: string
  email: string
  age: string
  country: string | null
  source: string | null
  accurate: string | null
  rating_careers: number | null
  rating_personality: number | null
  rating_clarity: number | null
  rating_length: number | null
  rating_overall: number | null
  surprised: string | null
  careers_relevant: string | null
  ai_outlook: string | null
  recommend: string | null
  other: string | null
  created_at: string
}

type OnetLink = {
  id: string
  email: string
  name: string | null
  onet_url: string
  label: string | null
  created_at: string
  has_assessment: boolean
}

type CountryProfile = {
  country_code: string
  country_name: string
  country_name_ar: string | null
  context_tier: string
  labour_market_authority: string | null
  nationalisation_programme: string | null
  strategic_priorities: any
  nationalisation_rates_by_sector: any
  wage_support_tiers: any
  job_boards: any
  source_url_primary: string | null
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [activeTab, setActiveTab] = useState<'submissions' | 'onet' | 'feedback' | 'country'>('submissions')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [selected, setSelected] = useState<Submission | null>(null)
  const [results, setResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackEntry | null>(null)

  const [onetLinks, setOnetLinks] = useState<OnetLink[]>([])
  const [onetLoading, setOnetLoading] = useState(false)
  const [onetError, setOnetError] = useState('')
  const [onetEmail, setOnetEmail] = useState('')
  const [onetUrl, setOnetUrl] = useState('')
  const [onetLabel, setOnetLabel] = useState('')
  const [onetAdding, setOnetAdding] = useState(false)
  const [selectedOnet, setSelectedOnet] = useState<OnetLink | null>(null)

  const [showComparison, setShowComparison]       = useState(false)
  const [comparisonResults, setComparisonResults] = useState<any>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)

  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([])
  const [countryLoading, setCountryLoading] = useState(false)
  const [countryError, setCountryError] = useState('')
  const [editingCountry, setEditingCountry] = useState<CountryProfile | null>(null)
  const [countryForm, setCountryForm] = useState<Partial<CountryProfile>>({})
  const [showCountryForm, setShowCountryForm] = useState(false)

  useEffect(() => {
    fetch('/api/admin/session').then(res => {
      if (res.ok) setAuthed(true)
    })
  }, [])

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/admin/submissions')
      if (!res.ok) throw new Error('Failed to load submissions')
      setSubmissions(await res.json())
    } catch (err: any) {
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const res = await fetch('/api/admin/feedback')
      if (!res.ok) throw new Error('Failed to load feedback')
      setFeedbackList(await res.json())
    } catch (err: any) {
      setFeedbackError(err.message)
    } finally {
      setFeedbackLoading(false)
    }
  }, [])

  const fetchOnetLinks = useCallback(async () => {
    setOnetLoading(true)
    setOnetError('')
    try {
      const res = await fetch('/api/admin/onet')
      if (!res.ok) throw new Error('Failed to load O*NET links')
      setOnetLinks(await res.json())
    } catch (err: any) {
      setOnetError(err.message)
    } finally {
      setOnetLoading(false)
    }
  }, [])

  const fetchCountryProfiles = useCallback(async () => {
    setCountryLoading(true)
    setCountryError('')
    try {
      const res = await fetch('/api/admin/country-profiles')
      if (!res.ok) throw new Error('Failed to load')
      setCountryProfiles(await res.json())
    } catch (err: any) {
      setCountryError(err.message)
    } finally {
      setCountryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) {
      fetchSubmissions()
      fetchOnetLinks()
      fetchFeedback()
      fetchCountryProfiles()
    }
  }, [authed, fetchSubmissions, fetchOnetLinks, fetchFeedback, fetchCountryProfiles])

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
      const sessionRes = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.session.access_token }),
      })
      if (!sessionRes.ok) {
        await supabase.auth.signOut()
        setLoginError('Not authorized as admin')
        return
      }
      setAuthed(true)
    } catch {
      setLoginError('Connection error, please try again')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await Promise.all([
      supabase.auth.signOut(),
      fetch('/api/admin/session', { method: 'DELETE' }),
    ])
    setAuthed(false)
    setSubmissions([])
    setSelected(null)
    setResults(null)
    setOnetLinks([])
    setSelectedOnet(null)
    setFeedbackList([])
    setSelectedFeedback(null)
  }

  async function handleViewResults(sub: Submission) {
    setSelected(sub)
    setResults(null)
    setResultsLoading(true)
    try {
      const res = await fetch(`/api/admin/submissions/${sub.id}/results`)
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
    await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' })
    setSubmissions(prev => prev.filter(s => s.id !== id))
  }

  async function handleAddOnet(e: React.FormEvent) {
    e.preventDefault()
    setOnetAdding(true)
    try {
      const res = await fetch('/api/admin/onet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: onetEmail, onet_url: onetUrl, label: onetLabel || null }),
      })
      if (!res.ok) throw new Error('Failed to add')
      setOnetEmail('')
      setOnetUrl('')
      setOnetLabel('')
      await fetchOnetLinks()
    } catch (err: any) {
      setOnetError(err.message)
    } finally {
      setOnetAdding(false)
    }
  }

  async function handleDeleteOnet(id: string) {
    try {
      await fetch(`/api/admin/onet/${id}`, { method: 'DELETE' })
      setOnetLinks(prev => prev.filter(l => l.id !== id))
      if (selectedOnet?.id === id) setSelectedOnet(null)
    } catch {
      // silent
    }
  }

  async function handleLoadComparison(sub: Submission) {
    setShowComparison(true)
    setComparisonLoading(true)
    setComparisonResults(null)
    try {
      const res  = await fetch(`/api/admin/submissions/${sub.id}/results`)
      const data = await res.json()
      setComparisonResults(data.summary)
    } catch { /* stay null */ }
    finally { setComparisonLoading(false) }
  }

  async function handleSaveCountry(e: React.FormEvent) {
    e.preventDefault()
    // Parse JSON fields
    const payload: any = { ...countryForm }
    for (const key of ['strategic_priorities', 'nationalisation_rates_by_sector', 'wage_support_tiers', 'job_boards']) {
      if (typeof payload[key] === 'string') {
        try {payload[key] = JSON.parse(payload[key]) } catch { payload[key] = null }
      }
    }
    if (editingCountry) {
      await fetch(`/api/admin/country-profiles/${editingCountry.country_code}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/admin/country-profiles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    setShowCountryForm(false)
    setEditingCountry(null)
    setCountryForm({})
    fetchCountryProfiles()
  }

  async function handleDeleteCountry(code: string){
    if (!confirm('Delete this country profile?')) return
    await fetch(`/api/admin/country-profiles/${code}`, { method: 'DELETE' })
    setCountryProfiles(prev => prev.filter(c => c.country_code !== code))
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

  // ── Feedback detail panel ─────────────────────────────
  if (selectedFeedback) {
    const fb = selectedFeedback
    const ratingLabel = (v: number | null) => v ? `${v} / 6` : '—'
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSelectedFeedback(null)}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Back
          </button>
          <div>
            <h2 className="font-semibold text-slate-800">{fb.fname}</h2>
            <p className="text-xs text-slate-400">{fb.email}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">About</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Name', fb.fname],
                ['Email', fb.email],
                ['Age group', fb.age],
                ['Country', fb.country],
                ['Source', fb.source],
                ['Submitted', new Date(fb.created_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Accuracy</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Overall accuracy', fb.accurate],
                ['Career suggestions', ratingLabel(fb.rating_careers)],
                ['Personality match', ratingLabel(fb.rating_personality)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium capitalize">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Experience Ratings</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Question clarity', ratingLabel(fb.rating_clarity)],
                ['Length', ratingLabel(fb.rating_length)],
                ['Overall', ratingLabel(fb.rating_overall)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Reflections</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Surprised by results', fb.surprised],
                ['Careers relevant', fb.careers_relevant],
                ['AI outlook changed thinking', fb.ai_outlook],
                ['Would recommend', fb.recommend],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium capitalize">{value?.replace(/_/g, ' ') || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {fb.other && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wide">Additional Comments</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{fb.other}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── O*NET detail panel + comparison view ─────────────
  if (selectedOnet) {
    const matchedSubmission = submissions.find(
      s => s.email?.toLowerCase() === selectedOnet.email.toLowerCase()
    )
    const onetScores = decodeOnetUrl(selectedOnet.onet_url)
    const onetTypes  = onetScores ? topRiasecTypes(onetScores) : []

    // ── Comparison view ──────────────────────────────────
    if (showComparison && matchedSubmission) {
      const ourTypes = comparisonResults?.riasec?.top_types ?? []
      const { matching, onlyOurs, onlyOnet, score, verdict } = riasecAgreement(ourTypes, onetTypes)
      const scoreColor = score >= 67 ? 'text-green-700 bg-green-50' : score >= 34 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
      const barColor   = score >= 67 ? 'bg-green-500' : score >= 34 ? 'bg-amber-400' : 'bg-red-400'

      return (
        <div className="min-h-screen bg-slate-50">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
            <button onClick={() => setShowComparison(false)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">← Back</button>
            <div>
              <h2 className="font-semibold text-slate-800">Assessment Comparison</h2>
              <p className="text-xs text-slate-400">{selectedOnet.email} · {matchedSubmission.full_name}</p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            {comparisonLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!comparisonLoading && (
              <>
                {/* Side-by-side columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* ── Our platform ── */}
                  <div className="space-y-4">
                    <div className="bg-blue-600 text-white rounded-2xl px-5 py-3 text-sm font-semibold">Our Platform Assessment</div>

                    {comparisonResults ? (
                      <>
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">RIASEC Career Types</p>
                          <div className="flex gap-2 flex-wrap">
                            {ourTypes.map((t: string, i: number) => (
                              <span key={t} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>{t}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Core Values</p>
                          <div className="flex gap-2 flex-wrap">
                            {comparisonResults.values.top_values.map((v: string, i: number) => (
                              <span key={v} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>{v}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Top Strengths</p>
                          <div className="flex gap-2 flex-wrap">
                            {comparisonResults.strengths.top_strengths.map((s: string, i: number) => (
                              <span key={s} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>{s}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Personality (Big Five)</p>
                          <div className="space-y-3">
                            {Object.entries(comparisonResults.big_five).map(([trait, level]: any) => (
                              <div key={trait}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium text-slate-700 capitalize">{trait.replace(/_/g, ' ')}</span>
                                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">{level}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: levelToWidth[level] ?? '50%' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-white rounded-2xl p-5 border border-slate-100 text-center text-slate-400 text-sm">No platform results found.</div>
                    )}
                  </div>

                  {/* ── O*NET ── */}
                  <div className="space-y-4">
                    <div className="bg-orange-500 text-white rounded-2xl px-5 py-3 text-sm font-semibold flex items-center justify-between">
                      <span>O*NET Interest Profiler</span>
                      <a href={selectedOnet.onet_url} target="_blank" rel="noopener noreferrer" className="text-orange-100 hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>

                    {onetScores ? (
                      <>
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Top Career Types</p>
                          <div className="flex gap-2 flex-wrap">
                            {onetTypes.map((t, i) => (
                              <span key={t} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>{t}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">All RIASEC Scores <span className="normal-case font-normal">(out of 20)</span></p>
                          <div className="space-y-3">
                            {Object.entries(onetScores).map(([trait, sc]) => (
                              <div key={trait}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium text-slate-700 capitalize">{trait}</span>
                                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{sc}/20</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                  <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${(sc / 20) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center text-orange-700 text-sm">
                        Could not decode scores from this URL.<br />
                        <a href={selectedOnet.onet_url} target="_blank" rel="noopener noreferrer" className="underline mt-1 inline-block">Open O*NET results →</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Agreement analysis ── */}
                {onetScores && comparisonResults && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-5 text-sm uppercase tracking-wide">Comparison Analysis</h3>

                    <div className="flex items-center gap-4 mb-4">
                      <div className={`text-3xl font-bold px-5 py-3 rounded-2xl ${scoreColor}`}>{score}%</div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">RIASEC Agreement</p>
                        <p className="text-xs text-slate-400 mt-0.5">{matching.length} of {Math.max(ourTypes.length, onetTypes.length)} top career types match across both assessments</p>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 mb-5">
                      <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { label: 'Both agree',        items: matching,  bg: 'bg-green-50',  text: 'text-green-700',  muted: 'text-green-400' },
                        { label: 'Only our platform', items: onlyOurs,  bg: 'bg-blue-50',   text: 'text-blue-700',   muted: 'text-blue-400' },
                        { label: 'Only O*NET',        items: onlyOnet,  bg: 'bg-orange-50', text: 'text-orange-700', muted: 'text-orange-400' },
                      ].map(({ label, items, bg, text, muted }) => (
                        <div key={label} className={`${bg} rounded-xl p-4`}>
                          <p className={`text-xs font-semibold ${text} uppercase tracking-wide mb-2`}>{label}</p>
                          {items.length > 0
                            ? items.map(t => <p key={t} className={`text-sm font-medium ${text} capitalize`}>{t}</p>)
                            : <p className={`text-xs ${muted}`}>None</p>}
                        </div>
                      ))}
                    </div>

                    <div className={`rounded-xl p-4 ${score >= 67 ? 'bg-green-50 border border-green-100' : score >= 34 ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'}`}>
                      <p className={`text-sm font-medium ${score >= 67 ? 'text-green-800' : score >= 34 ? 'text-amber-800' : 'text-red-800'}`}>{verdict}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )
    }

    // ── O*NET detail panel ───────────────────────────────
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
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-orange-700 text-sm uppercase tracking-wide">O*NET Link</h3>
              {onetScores && (
                <div className="flex gap-1 flex-wrap justify-end">
                  {onetTypes.map((t, i) => (
                    <span key={t} className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${i === 0 ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'}`}>{t}</span>
                  ))}
                </div>
              )}
            </div>
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
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setSelectedOnet(null); handleViewResults(matchedSubmission) }}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  View full assessment results →
                </button>
                {matchedSubmission.completed && (
                  <button
                    onClick={() => handleLoadComparison(matchedSubmission)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Compare Results
                  </button>
                )}
              </div>
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
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-bold text-slate-800">Admin Panel</h1>
            <p className="text-xs text-slate-400">Etijah Career Compass</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { fetchSubmissions(); fetchOnetLinks(); fetchFeedback(); fetchCountryProfiles() }}
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
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'submissions' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Submissions
            {submissions.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/30 px-1.5 py-0.5 rounded-full">{submissions.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('onet')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'onet' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            O*NET Links
            {onetLinks.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/30 px-1.5 py-0.5 rounded-full">{onetLinks.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'feedback' ? 'bg-teal-700 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Feedback
            {feedbackList.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/30 px-1.5 py-0.5 rounded-full">{feedbackList.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('country')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'country' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Country Profiles
            {countryProfiles.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/30 px-1.5 py-0.5 rounded-full">{countryProfiles.length}</span>
            )}
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
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
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
                              {new Date(sub.created_at) >= new Date('2026-06-10') && (
                                <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">v2</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-slate-500">{sub.email || '—'}</div>
                              {sub.phone && <div className="text-slate-400 text-xs">{sub.phone}</div>}
                            </td>
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

        {/* ── Feedback Tab ── */}
        {activeTab === 'feedback' && (
          <>
            {feedbackLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {feedbackError && <p className="text-red-500 text-sm text-center py-8">{feedbackError}</p>}
            {!feedbackLoading && !feedbackError && (
              <>
                <p className="text-sm text-slate-400 mb-4">{feedbackList.length} response{feedbackList.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Accurate?</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackList.map((fb, i) => (
                        <tr key={fb.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{fb.fname}</td>
                          <td className="px-4 py-3 text-slate-500">{fb.email}</td>
                          <td className="px-4 py-3 text-slate-500">{fb.age}</td>
                          <td className="px-4 py-3 text-slate-500">{fb.country || '—'}</td>
                          <td className="px-4 py-3">
                            {fb.accurate ? (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                                fb.accurate === 'yes' ? 'bg-green-50 text-green-700' :
                                fb.accurate === 'partially' ? 'bg-amber-50 text-amber-600' :
                                'bg-red-50 text-red-600'
                              }`}>{fb.accurate}</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {fb.rating_overall ? (
                              <span className="font-semibold text-slate-700">{fb.rating_overall}<span className="text-slate-400 font-normal">/6</span></span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(fb.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedFeedback(fb)}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                      {feedbackList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No feedback responses yet</td>
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Email</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Name</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Label</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">O*NET URL</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Assessment</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Added</th>
                        <th className="px-3 py-3 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {onetLinks.map((link, i) => (
                        <tr key={link.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-3 py-3 font-medium text-slate-800 truncate max-w-[160px]">{link.email}</td>
                          <td className="px-3 py-3 text-slate-600 truncate max-w-[128px]">{link.name || '—'}</td>
                          <td className="px-3 py-3 text-slate-500 truncate max-w-[96px]">{link.label || '—'}</td>
                          <td className="px-3 py-3 text-slate-500 truncate max-w-[180px]">
                            <a href={link.onet_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                              {link.onet_url}
                            </a>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${link.has_assessment ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                              {link.has_assessment ? 'Submitted' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-400 text-xs">{new Date(link.created_at).toLocaleDateString()}</td>
                          <td className="px-3 py-3 flex items-center gap-3">
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
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No O*NET links added yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Country Profiles Tab ── */}
        {activeTab === 'country' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">{countryProfiles.length} profile{countryProfiles.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => { setEditingCountry(null); setCountryForm({}); setShowCountryForm(true) }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                + Add Country
              </button>
            </div>

            {showCountryForm && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
                  {editingCountry ? `Edit — ${editingCountry.country_name}` : 'New Country Profile'}
                </h2>
                <form onSubmit={handleSaveCountry} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['country_code', 'Country Code (2-letter)', false],
                      ['country_name', 'Country Name (EN)', false],
                      ['country_name_ar', 'Country Name (AR)', true],
                      ['labour_market_authority', 'Labour Market Authority', true],
                      ['nationalisation_programme', 'Nationalisation Programme', true],
                      ['source_url_primary', 'Source URL', true],
                    ] as [string, string, boolean][]).map(([key, label, optional]) => (
                      <div key={key}>
                        <label className="block text-xs text-slate-500 mb-1">{label}</label>
                        <input
                          type="text"
                          required={!optional}
                          value={(countryForm as any)[key] ?? ''}
                          onChange={e => setCountryForm(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    ))}
                  </div>
                  {(['strategic_priorities', 'nationalisation_rates_by_sector', 'wage_support_tiers', 'job_boards'] as const).map(key => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                      <textarea
                        rows={3}
                        value={
                          typeof (countryForm as any)[key] === 'object' && (countryForm as any)[key] !== null
                            ? JSON.stringify((countryForm as any)[key], null, 2)
                            : ((countryForm as any)[key] ?? '')
                        }
                        onChange={e => setCountryForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder='{"key": "value"}'
                      />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                      {editingCountry ? 'Save Changes' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCountryForm(false); setEditingCountry(null); setCountryForm({}) }}
                      className="text-sm text-slate-400 hover:text-slate-600 px-3 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {countryLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {countryError && <p className="text-red-500 text-sm text-center py-8">{countryError}</p>}

            {!countryLoading && !countryError && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Labour Authority</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Strategic Priorities</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {countryProfiles.map((cp, i) => (
                      <tr key={cp.country_code} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{cp.country_code}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{cp.country_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cp.context_tier === 'complete' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                            {cp.context_tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{cp.labour_market_authority || '—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono truncate max-w-xs">
                          {cp.strategic_priorities ? JSON.stringify(cp.strategic_priorities).slice(0, 60) + '…' : '—'}
                        </td>
                        <td className="px-4 py-3 flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingCountry(cp)
                              setCountryForm({
                                ...cp,
                                strategic_priorities: cp.strategic_priorities ? JSON.stringify(cp.strategic_priorities, null, 2) : '',
                                nationalisation_rates_by_sector: cp.nationalisation_rates_by_sector ? JSON.stringify(cp.nationalisation_rates_by_sector, null, 2) : '',
                                wage_support_tiers: cp.wage_support_tiers ? JSON.stringify(cp.wage_support_tiers, null, 2) : '',
                                job_boards: cp.job_boards ? JSON.stringify(cp.job_boards, null, 2) : '',
                              })
                              setShowCountryForm(true)
                            }}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCountry(cp.country_code)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {countryProfiles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No country profiles yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
