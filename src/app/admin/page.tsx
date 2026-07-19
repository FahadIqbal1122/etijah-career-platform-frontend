'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'

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

type WaitlistEntry = {
  id: string
  email: string
  name: string | null
  country: string | null
  status: string | null
  locale: string | null
  source: string | null
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

type CoachingSessionEntry = {
  id: string
  client_label: string | null
  topic: string | null
  session_date: string | null
  created_at: string
}

type CourseEntry = {
  id: string
  title: string
  provider: string
  url: string
  description: string | null
  skill_tags: string[]
  career_tags: string[]
  riasec_tags: string[]
  is_free: boolean
  level: string
  duration_hours: number | null
  language: string
  country_code: string | null
  created_at: string
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [activeTab, setActiveTab] = useState<'submissions' | 'onet' | 'feedback' | 'waitlist' | 'coaching' | 'country' | 'courses' | 'market'>('submissions')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [selected, setSelected] = useState<Submission | null>(null)
  const [results, setResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [adminJobs, setAdminJobs] = useState<any[]>([])
  const [adminAiImpact, setAdminAiImpact] = useState<any>(null)
  const [adminAiLoading, setAdminAiLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackEntry | null>(null)

  const [waitlistList, setWaitlistList] = useState<WaitlistEntry[]>([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')

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

  const [coachingSessions, setCoachingSessions] = useState<CoachingSessionEntry[]>([])
  const [coachingLoading, setCoachingLoading] = useState(false)
  const [coachingError, setCoachingError] = useState('')
  const [coachingSubmitting, setCoachingSubmitting] = useState(false)
  const [coachingSuccess, setCoachingSuccess] = useState('')
  const [coachingForm, setCoachingForm] = useState({
    client_label: '', topic: '', session_date: '', raw_transcript: '',
  })

  const [marketTrends, setMarketTrends] = useState<any>(null)
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketError, setMarketError] = useState('')
  const [marketFetching, setMarketFetching] = useState(false)
  const [marketFetchResult, setMarketFetchResult] = useState<any>(null)
  const [marketCountryFilter, setMarketCountryFilter] = useState<'SA' | 'BH' | 'both'>('both')
  const [marketRoleFilter, setMarketRoleFilter] = useState<string>('all')

  const [courses, setCourses] = useState<CourseEntry[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [coursesError, setCoursesError] = useState('')
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [courseAdding, setCourseAdding] = useState(false)
  const [courseForm, setCourseForm] = useState({
    title: '', provider: '', url: '', description: '',
    skill_tags: '', career_tags: '', riasec_tags: '',
    is_free: false, level: 'beginner', duration_hours: '', language: 'en',
    country_code: '',
  })

  useEffect(() => {
    fetch('/api/admin/session').then(res => {
      if (res.ok) setAuthed(true)
    })
  }, [])

  // Supabase silently refreshes the access token in the background (persistSession +
  // autoRefreshToken are on by default), but the httpOnly admin_session cookie used to
  // authenticate proxy requests is only ever set once at login. Resync it on every
  // refresh so the cookie doesn't go stale ~1h into a session while the client still
  // thinks it's logged in.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.access_token) {
        fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.access_token }),
        })
      }
    })
    return () => subscription.unsubscribe()
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

  const fetchWaitlist = useCallback(async () => {
    setWaitlistLoading(true)
    setWaitlistError('')
    try {
      const res = await fetch('/api/admin/waitlist')
      if (!res.ok) throw new Error('Failed to load waitlist')
      setWaitlistList(await res.json())
    } catch (err: any) {
      setWaitlistError(err.message)
    } finally {
      setWaitlistLoading(false)
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

  const fetchCoachingSessions = useCallback(async () => {
    setCoachingLoading(true)
    setCoachingError('')
    try {
      const res = await fetch('/api/admin/coaching-sessions')
      if (!res.ok) throw new Error('Failed to load coaching sessions')
      setCoachingSessions(await res.json())
    } catch (err: any) {
      setCoachingError(err.message)
    } finally {
      setCoachingLoading(false)
    }
  }, [])

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true)
    setCoursesError('')
    try {
      const res = await fetch('/api/admin/courses')
      if (!res.ok) throw new Error('Failed to load courses')
      setCourses(await res.json())
    } catch (err: any) {
      setCoursesError(err.message)
    } finally {
      setCoursesLoading(false)
    }
  }, [])

  const fetchMarketTrends = useCallback(async () => {
    setMarketLoading(true)
    setMarketError('')
    try {
      const res = await fetch('/api/admin/market-analysis/trends')
      if (!res.ok) throw new Error('Failed to load market trends')
      setMarketTrends(await res.json())
    } catch (err: any) {
      setMarketError(err.message)
    } finally {
      setMarketLoading(false)
    }
  }, [])

  async function triggerMarketFetch() {
    setMarketFetching(true)
    setMarketFetchResult(null)
    try {
      const res = await fetch('/api/admin/market-analysis/fetch', {
        method: 'POST',
        signal: AbortSignal.timeout(120_000),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : { error: 'Empty response from server' }
      setMarketFetchResult(data)
      fetchMarketTrends()
    } catch (err: any) {
      setMarketFetchResult({ error: err.message })
    } finally {
      setMarketFetching(false)
    }
  }

  useEffect(() => {
    if (authed) {
      fetchSubmissions()
      fetchOnetLinks()
      fetchFeedback()
      fetchWaitlist()
      fetchCoachingSessions()
      fetchCountryProfiles()
      fetchCourses()
      fetchMarketTrends()
    }
  }, [authed, fetchSubmissions, fetchOnetLinks, fetchFeedback, fetchWaitlist, fetchCoachingSessions, fetchCountryProfiles, fetchCourses, fetchMarketTrends])

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
    setWaitlistList([])
    setCoachingSessions([])
  }

  async function handleViewResults(sub: Submission) {
    setSelected(sub)
    setResults(null)
    setAdminJobs([])
    setAdminAiImpact(null)
    setResultsLoading(true)
    setAdminAiLoading(true)
    try {
      const res = await fetch(`/api/admin/submissions/${sub.id}/results`)
      const data = await res.json()
      setResults(data.summary)
    } catch {
      setResults(null)
    } finally {
      setResultsLoading(false)
    }
    fetch(`/api/admin/submissions/${sub.id}/career-suggestions`)
      .then(r => r.json()).then(d => setAdminJobs(d.suggestions || [])).catch(() => {})
    fetch(`/api/admin/submissions/${sub.id}/ai-impact`)
      .then(r => r.json()).then(d => setAdminAiImpact(d)).catch(() => {}).finally(() => setAdminAiLoading(false))
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
    const payload: any = { ...countryForm }
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

  async function handleAddCoachingSession(e: React.FormEvent) {
    e.preventDefault()
    setCoachingSubmitting(true)
    setCoachingError('')
    setCoachingSuccess('')
    try {
      const res = await fetch('/api/admin/coaching-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_label: coachingForm.client_label || null,
          topic: coachingForm.topic || null,
          session_date: coachingForm.session_date || null,
          raw_transcript: coachingForm.raw_transcript,
        }),
      })
      if (!res.ok) throw new Error('Failed to process transcript')
      const data = await res.json()
      setCoachingSuccess(`Processed — ${data.chunks_created} coaching beats extracted.`)
      setCoachingForm({ client_label: '', topic: '', session_date: '', raw_transcript: '' })
      fetchCoachingSessions()
    } catch (err: any) {
      setCoachingError(err.message)
    } finally {
      setCoachingSubmitting(false)
    }
  }

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault()
    setCourseAdding(true)
    setCoursesError('')
    try {
      const payload = {
        ...courseForm,
        skill_tags:  courseForm.skill_tags.split(',').map(s => s.trim()).filter(Boolean),
        career_tags: courseForm.career_tags.split(',').map(s => s.trim()).filter(Boolean),
        riasec_tags: courseForm.riasec_tags.split(',').map(s => s.trim()).filter(Boolean),
        duration_hours: courseForm.duration_hours ? parseInt(courseForm.duration_hours) : null,
        country_code: courseForm.country_code.trim().toUpperCase() || null,
      }
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to add course')
      setCourseForm({ title: '', provider: '', url: '', description: '', skill_tags: '', career_tags: '', riasec_tags: '', is_free: false, level: 'beginner', duration_hours: '', language: 'en', country_code: '' })
      setShowCourseForm(false)
      fetchCourses()
    } catch (err: any) {
      setCoursesError(err.message)
    } finally {
      setCourseAdding(false)
    }
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('Delete this course?')) return
    await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  const onetLinkForEmail = (email: string) =>
    onetLinks.find(l => l.email.toLowerCase() === email?.toLowerCase())

  // ── Login ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3">
            <Logomark size={34} />
            <div>
              <h1 className="text-xl font-extrabold text-charcoal leading-none">Admin Panel</h1>
              <p className="text-xs text-charcoal/40 mt-1">Etijahi · إتجاهي</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
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
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
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
              className="w-full bg-primary hover:bg-primary-deep disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
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
      <div className="min-h-screen brand-surface">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setSelected(null); setResults(null) }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
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
                : 'border-[var(--line-strong)] bg-white text-primary hover:bg-lightblue hover:border-primary'
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
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {results && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Career Types (RIASEC)</h3>
                <div className="flex gap-2 flex-wrap">
                  {results.riasec.top_types.map((t: string, i: number) => (
                    <span key={t} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-primary text-white' : 'bg-lightblue text-primary border border-[var(--line)]'}`}>{t}</span>
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

              {results.work_style && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Work Style & Resilience</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      { label: 'Pace', low: 'Steady', high: 'Fast-paced', score: results.work_style.pace },
                      { label: 'Environment', low: 'Large org', high: 'Startup', score: results.work_style.environment },
                      { label: 'Sector', low: 'Public', high: 'Private', score: results.work_style.sector },
                      { label: 'Mobility', low: 'Local', high: 'Open to relocate', score: results.work_style.mobility },
                      ...(results.resilience ? [
                        { label: 'Long-term focus', low: 'Short-term', high: 'Long-term', score: results.resilience.long_term_focus },
                        { label: 'Resilience', low: 'Needs support', high: 'Bounces back', score: results.resilience.workplace_resilience },
                      ] : []),
                    ].map(({ label, low, high, score }) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-slate-500">{label}</span>
                          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{score >= 50 ? high : low}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {adminJobs.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Suggested Careers</h3>
              <div className="flex gap-2 flex-wrap">
                {adminJobs.map((job: any, i: number) => (
                  <span key={job.title} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                    {job.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {adminAiLoading && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
              </div>
            </div>
          )}

          {!adminAiLoading && adminAiImpact && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">AI Impact on Careers</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">{adminAiImpact.overall_summary}</p>
              <div className="space-y-3">
                {adminAiImpact.careers?.map((c: any) => (
                  <div key={c.title} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{c.title}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        c.ai_risk_level === 'low' ? 'bg-green-50 text-green-700' :
                        c.ai_risk_level === 'medium' ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>{c.ai_risk_level?.toUpperCase()} RISK</span>
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
                          <span className="text-primary/70 mt-0.5">→</span>{tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
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
      <div className="min-h-screen brand-surface">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSelectedFeedback(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
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
        <div className="min-h-screen brand-surface">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
            <button onClick={() => setShowComparison(false)} className="text-sm text-primary hover:underline flex items-center gap-1">← Back</button>
            <div>
              <h2 className="font-semibold text-slate-800">Assessment Comparison</h2>
              <p className="text-xs text-slate-400">{selectedOnet.email} · {matchedSubmission.full_name}</p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            {comparisonLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!comparisonLoading && (
              <>
                {/* Side-by-side columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* ── Our platform ── */}
                  <div className="space-y-4">
                    <div className="bg-primary text-white rounded-2xl px-5 py-3 text-sm font-semibold">Our Platform Assessment</div>

                    {comparisonResults ? (
                      <>
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">RIASEC Career Types</p>
                          <div className="flex gap-2 flex-wrap">
                            {ourTypes.map((t: string, i: number) => (
                              <span key={t} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-primary text-white' : 'bg-lightblue text-primary border border-[var(--line)]'}`}>{t}</span>
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
                        { label: 'Only our platform', items: onlyOurs,  bg: 'bg-lightblue',   text: 'text-primary',   muted: 'text-primary/70' },
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
      <div className="min-h-screen brand-surface">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSelectedOnet(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
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
                  className="text-sm text-primary hover:underline font-medium"
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
    <div className="min-h-screen brand-surface">
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Logomark size={30} />
            <div>
              <h1 className="font-extrabold text-charcoal">Admin Panel</h1>
              <p className="text-xs text-charcoal/40">Etijahi · إتجاهي</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { fetchSubmissions(); fetchOnetLinks(); fetchFeedback(); fetchWaitlist(); fetchCoachingSessions(); fetchCountryProfiles(); fetchCourses(); fetchMarketTrends() }}
              className="text-sm text-primary hover:underline"
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
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'submissions' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700'}`}
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
            onClick={() => setActiveTab('waitlist')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'waitlist' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Waitlist
            {waitlistList.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/30 px-1.5 py-0.5 rounded-full">{waitlistList.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('coaching')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'coaching' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Coaching Sessions
            {coachingSessions.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/30 px-1.5 py-0.5 rounded-full">{coachingSessions.length}</span>
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
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'courses' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Courses
            {courses.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/30 px-1.5 py-0.5 rounded-full">{courses.length}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('market'); fetchMarketTrends() }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'market' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Market Analysis
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Submissions Tab ── */}
        {activeTab === 'submissions' && (
          <>
            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                                <span className="ml-2 text-xs font-semibold bg-lightblue text-primary px-1.5 py-0.5 rounded-full">v2</span>
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
                                className="text-xs text-primary hover:underline font-medium"
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
                              className="text-xs text-primary hover:underline font-medium"
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

        {/* ── Waitlist Tab ── */}
        {activeTab === 'waitlist' && (
          <>
            {waitlistLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {waitlistError && <p className="text-red-500 text-sm text-center py-8">{waitlistError}</p>}
            {!waitlistLoading && !waitlistError && (
              <>
                <p className="text-sm text-slate-400 mb-4">{waitlistList.length} signup{waitlistList.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Locale</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistList.map((w, i) => (
                        <tr key={w.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{w.email}</td>
                          <td className="px-4 py-3 text-slate-500">{w.name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.country || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.status || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 uppercase">{w.locale || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.source || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {waitlistList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No waitlist signups yet</td>
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
                              className="text-xs text-primary hover:underline font-medium"
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

        {/* ── Coaching Sessions Tab ── */}
        {activeTab === 'coaching' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Upload Coaching Transcript</h2>
              <form onSubmit={handleAddCoachingSession} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Client Label (optional, anonymized)</label>
                    <input
                      type="text"
                      value={coachingForm.client_label}
                      onChange={e => setCoachingForm(prev => ({ ...prev, client_label: e.target.value }))}
                      placeholder="e.g. Client A"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Topic (optional)</label>
                    <input
                      type="text"
                      value={coachingForm.topic}
                      onChange={e => setCoachingForm(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g. Career transition"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Session Date (optional)</label>
                    <input
                      type="date"
                      value={coachingForm.session_date}
                      onChange={e => setCoachingForm(prev => ({ ...prev, session_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Speaker-Labeled Transcript ("Coach:" / "Client:")</label>
                  <textarea
                    required
                    rows={10}
                    value={coachingForm.raw_transcript}
                    onChange={e => setCoachingForm(prev => ({ ...prev, raw_transcript: e.target.value }))}
                    placeholder={'Coach: So tell me, what\'s been on your mind...\nClient: Honestly, I\'ve been stuck on...'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={coachingSubmitting}
                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    {coachingSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {coachingSubmitting ? 'Processing…' : 'Upload & Process'}
                  </button>
                  {coachingSuccess && <p className="text-green-600 text-sm">{coachingSuccess}</p>}
                  {coachingError && <p className="text-red-500 text-sm">{coachingError}</p>}
                </div>
              </form>
            </div>

            {coachingLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!coachingLoading && (
              <>
                <p className="text-sm text-slate-400 mb-4">{coachingSessions.length} session{coachingSessions.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Topic</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Session Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachingSessions.map((s, i) => (
                        <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{s.client_label || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{s.topic || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{s.session_date || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {coachingSessions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-400">No coaching sessions uploaded yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Courses Tab ── */}
        {activeTab === 'courses' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowCourseForm(v => !v)}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {showCourseForm ? 'Cancel' : '+ Add Course'}
              </button>
            </div>

            {showCourseForm && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">New Course</h2>
                <form onSubmit={handleAddCourse} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['title', 'Title', 'text', true],
                      ['provider', 'Provider (e.g. Coursera)', 'text', true],
                      ['url', 'URL', 'url', true],
                      ['duration_hours', 'Duration (hours)', 'number', false],
                      ['country_code', 'Country Code (e.g. SA, BH — blank = global)', 'text', false],
                    ] as [string, string, string, boolean][]).map(([key, label, type, required]) => (
                      <div key={key}>
                        <label className="block text-xs text-slate-500 mb-1">{label}</label>
                        <input
                          type={type}
                          required={required}
                          value={(courseForm as any)[key]}
                          onChange={e => setCourseForm(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Level</label>
                      <select
                        value={courseForm.level}
                        onChange={e => setCourseForm(prev => ({ ...prev, level: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Language</label>
                      <select
                        value={courseForm.language}
                        onChange={e => setCourseForm(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={courseForm.description}
                      onChange={e => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  {([
                    ['skill_tags', 'Skill Tags (comma-separated, e.g. leadership, communication)'],
                    ['career_tags', 'Career Tags (comma-separated, e.g. Product Manager, Data Analyst)'],
                    ['riasec_tags', 'RIASEC Tags (comma-separated, e.g. enterprising, investigative)'],
                  ] as [string, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1">{label}</label>
                      <input
                        type="text"
                        value={(courseForm as any)[key]}
                        onChange={e => setCourseForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_free"
                      checked={courseForm.is_free}
                      onChange={e => setCourseForm(prev => ({ ...prev, is_free: e.target.checked }))}
                      className="w-4 h-4 accent-violet-600"
                    />
                    <label htmlFor="is_free" className="text-sm text-slate-600">Free course</label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={courseAdding}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                      {courseAdding && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Add Course
                    </button>
                  </div>
                  {coursesError && <p className="text-red-500 text-xs mt-1">{coursesError}</p>}
                </form>
              </div>
            )}

            {coursesLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!coursesLoading && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Level</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Skill Tags</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Free?</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lang</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c, i) => (
                      <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 hover:underline">{c.title}</a>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.provider}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 capitalize">{c.level}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.skill_tags?.slice(0, 3).map(t => (
                              <span key={t} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                            {(c.skill_tags?.length ?? 0) > 3 && (
                              <span className="text-xs text-slate-400">+{c.skill_tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {c.country_code
                            ? <span className="text-xs font-mono font-bold text-slate-700">{c.country_code}</span>
                            : <span className="text-xs text-slate-300">Global</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.is_free ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {c.is_free ? 'Free' : 'Paid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 uppercase text-xs font-mono">{c.language}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {courses.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No courses yet — add your first one above</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Country Notes</label>
                    <p className="text-xs text-slate-400 mb-2">Paste any information about this country's labour market — government websites, news articles, reports, anything. The AI will use this when coaching users from this country and generating their reports.</p>
                    <textarea
                      rows={10}
                      value={(countryForm as any).raw_notes ?? ''}
                      onChange={e => setCountryForm(prev => ({ ...prev, raw_notes: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="Paste any text about this country's job market, nationalisation policies, key industries, salary ranges, hiring trends..."
                    />
                  </div>
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
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
                        <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-xs">
                          {(cp as any).raw_notes ? (cp as any).raw_notes.slice(0, 80) + '…' : <span className="text-slate-300">No notes yet</span>}
                        </td>
                        <td className="px-4 py-3 flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingCountry(cp)
                              setCountryForm({ ...cp })
                              setShowCountryForm(true)
                            }}
                            className="text-xs text-primary hover:underline font-medium"
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
      {/* ── Market Analysis Tab ── */}
      {activeTab === 'market' && (
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-800">GCC Job Market Intelligence</h2>
              <p className="text-sm text-slate-400 mt-1">Saudi Arabia &amp; Bahrain · 25 role categories · weekly snapshots</p>
            </div>
            <button
              onClick={triggerMarketFetch}
              disabled={marketFetching}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {marketFetching ? (<><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Fetching jobs…</>) : '↻ Fetch This Week'}
            </button>
          </div>

          {marketFetchResult && (
            <div className={`mb-5 px-4 py-3 rounded-xl text-sm ${marketFetchResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {marketFetchResult.error ? `Error: ${marketFetchResult.error}` : `✓ Week ${marketFetchResult.week}: ${marketFetchResult.inserted} new jobs stored (${marketFetchResult.errors} errors)`}
            </div>
          )}

          {marketLoading && <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}
          {marketError && <p className="text-red-500 text-sm text-center py-8">{marketError}</p>}

          {!marketLoading && !marketError && marketTrends && marketTrends.weeks?.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-20 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-slate-600 font-medium mb-1">No data yet</p>
              <p className="text-slate-400 text-sm">Click <strong>Fetch This Week</strong> to collect the first snapshot.</p>
            </div>
          )}

          {!marketLoading && !marketError && marketTrends && marketTrends.weeks?.length > 0 && (() => {
            const cf = marketCountryFilter
            const filteredDemand = (marketTrends.demand || []).filter((d: any) => cf === 'both' || d.country === cf)
            const filteredSalary = (marketTrends.salary || []).filter((s: any) => cf === 'both' || s.country === cf)
            const filteredJobs = (marketTrends.recent_jobs || []).filter((j: any) => cf === 'both' || j.country_code === cf)
            const filteredCompanies = cf === 'both'
              ? (marketTrends.top_companies || [])
              : (marketTrends.top_companies || []).filter((c: any) => c[cf] > 0).map((c: any) => ({...c, total: c[cf]})).sort((a: any, b: any) => b.total - a.total)

            const latestWeek = marketTrends.weeks[marketTrends.weeks.length - 1]
            const roleCount: Record<string, number> = {}
            for (const d of filteredDemand) {
              if (d.week === latestWeek) roleCount[d.role] = (roleCount[d.role] || 0) + d.count
            }
            const totalJobs = Object.values(roleCount).reduce((s: number, v) => s + (v as number), 0)
            const sortedRoles = [...(marketTrends.roles || [])].sort((a, b) => (roleCount[b] || 0) - (roleCount[a] || 0))
            const maxRoleCount = Math.max(...Object.values(roleCount).map(Number), 1)

            const salaryByRole: Record<string, number[]> = {}
            for (const s of filteredSalary) {
              if (!salaryByRole[s.role]) salaryByRole[s.role] = []
              salaryByRole[s.role].push(s.avg_salary)
            }

            const maxCompanyCount = Math.max(...filteredCompanies.slice(0,10).map((c: any) => c.total), 1)

            return (
              <>
                {/* Country filter */}
                <div className="flex gap-3 mb-6 flex-wrap items-center">
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['both', 'SA', 'BH'] as const).map(c => (
                      <button key={c} onClick={() => setMarketCountryFilter(c)}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${marketCountryFilter === c ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {c === 'both' ? 'Both Countries' : c === 'SA' ? '🇸🇦 Saudi Arabia' : '🇧🇭 Bahrain'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Jobs Collected', value: marketTrends.total_snapshots?.toLocaleString(), sub: 'all time' },
                    { label: 'This Week', value: totalJobs.toLocaleString(), sub: latestWeek },
                    { label: 'Companies Hiring', value: (filteredCompanies.length || marketTrends.total_companies)?.toLocaleString(), sub: 'unique employers' },
                    { label: 'Weeks of Data', value: marketTrends.weeks.length, sub: `since ${marketTrends.weeks[0]}` },
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <p className="text-xs text-slate-400 font-medium mb-1">{kpi.label}</p>
                      <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Top Companies + Demand side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                  {/* Top Hiring Companies */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Top Hiring Companies</h3>
                    <p className="text-xs text-slate-400 mb-4">By total job postings collected</p>
                    <div className="space-y-2.5">
                      {filteredCompanies.slice(0, 10).map((c: any, i: number) => {
                        const pct = Math.round((c.total / maxCompanyCount) * 100)
                        return (
                          <div key={c.company} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i+1}</span>
                            <span className="text-xs text-slate-700 w-32 shrink-0 truncate font-medium">{c.company}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div className="h-3 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-6 text-right">{c.total}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Demand by Role */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Job Demand by Role</h3>
                    <p className="text-xs text-slate-400 mb-4">Latest week · {latestWeek}</p>
                    <div className="space-y-2">
                      {sortedRoles.map((role: string) => {
                        const count = roleCount[role] || 0
                        const pct = Math.round((count / maxRoleCount) * 100)
                        const salaryAvg = salaryByRole[role] ? Math.round(salaryByRole[role].reduce((s, v) => s + v, 0) / salaryByRole[role].length) : null
                        return (
                          <div key={role} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-32 shrink-0 capitalize">{role}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div className="h-3 rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-5 text-right">{count}</span>
                            {salaryAvg && <span className="text-[10px] text-slate-400 w-16 text-right hidden md:block">{salaryAvg.toLocaleString()}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* SA vs BH comparison */}
                {cf === 'both' && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Saudi Arabia vs Bahrain</h3>
                    <p className="text-xs text-slate-400 mb-4">Job postings per role this week</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left px-2 py-2 text-slate-400 font-medium">Role</th>
                            <th className="text-center px-2 py-2 text-primary font-semibold">🇸🇦 SA</th>
                            <th className="text-center px-2 py-2 text-emerald-600 font-semibold">🇧🇭 BH</th>
                            <th className="text-center px-2 py-2 text-slate-400 font-medium">Total</th>
                            <th className="text-center px-2 py-2 text-slate-400 font-medium">Leader</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRoles.map((role: string) => {
                            const sa = (marketTrends.demand || []).find((d: any) => d.role === role && d.country === 'SA' && d.week === latestWeek)?.count || 0
                            const bh = (marketTrends.demand || []).find((d: any) => d.role === role && d.country === 'BH' && d.week === latestWeek)?.count || 0
                            const total = sa + bh
                            if (total === 0) return null
                            return (
                              <tr key={role} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="px-2 py-2 capitalize text-slate-700 font-medium">{role}</td>
                                <td className="px-2 py-2 text-center font-semibold text-primary">{sa}</td>
                                <td className="px-2 py-2 text-center font-semibold text-emerald-700">{bh}</td>
                                <td className="px-2 py-2 text-center text-slate-600">{total}</td>
                                <td className="px-2 py-2 text-center">{sa > bh ? '🇸🇦' : bh > sa ? '🇧🇭' : '='}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Trend over time */}
                {marketTrends.weeks.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Weekly Volume Trend</h3>
                    <p className="text-xs text-slate-400 mb-4">Total job postings collected per week</p>
                    <div className="flex items-end gap-2" style={{ height: '100px' }}>
                      {marketTrends.weeks.map((week: string) => {
                        const total = filteredDemand.filter((d: any) => d.week === week).reduce((s: number, d: any) => s + d.count, 0)
                        const maxTotal = Math.max(...marketTrends.weeks.map((w: string) => filteredDemand.filter((d: any) => d.week === w).reduce((s: number, d: any) => s + d.count, 0)), 1)
                        const pct = Math.round((total / maxTotal) * 100)
                        return (
                          <div key={week} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] text-slate-500">{total}</span>
                            <div className="w-full bg-slate-100 rounded-t-lg flex items-end" style={{ height: '72px' }}>
                              <div className="w-full bg-amber-400 rounded-t-lg transition-all duration-500" style={{ height: `${pct}%` }} />
                            </div>
                            <span className="text-[9px] text-slate-400">{week.slice(5)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Salary insights */}
                {Object.keys(salaryByRole).length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Salary Insights by Role</h3>
                    <p className="text-xs text-slate-400 mb-4">Average across all collected listings where salary was disclosed</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(salaryByRole)
                        .map(([role, vals]) => ({ role, avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), count: vals.length }))
                        .sort((a, b) => b.avg - a.avg)
                        .map(({ role, avg, count }) => (
                          <div key={role} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs text-slate-500 capitalize mb-1">{role}</p>
                            <p className="text-lg font-bold text-slate-800">{avg.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{count} data point{count !== 1 ? 's' : ''}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Recent job listings */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-0.5">Recent Job Listings</h3>
                  <p className="text-xs text-slate-400 mb-4">Latest 50 jobs collected — click to view posting</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Job Title</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Company</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Category</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Location</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Salary</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJobs.map((job: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 group">
                            <td className="px-3 py-2 max-w-[200px]">
                              {job.url ? (
                                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium line-clamp-1">{job.job_title || '—'}</a>
                              ) : (
                                <span className="font-medium text-slate-700 line-clamp-1">{job.job_title || '—'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{job.company || '—'}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs capitalize">{job.role_category}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{job.location || '—'}</td>
                            <td className="px-3 py-2 text-slate-600 text-xs">
                              {job.salary_min || job.salary_max
                                ? `${job.salary_min ? job.salary_min.toLocaleString() : '?'} – ${job.salary_max ? job.salary_max.toLocaleString() : '?'} ${job.salary_currency || ''}`
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-sm">{job.country_code === 'SA' ? '🇸🇦' : '🇧🇭'}</td>
                          </tr>
                        ))}
                        {filteredJobs.length === 0 && (
                          <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-sm">No jobs found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      </div>
    </div>
  )
}
