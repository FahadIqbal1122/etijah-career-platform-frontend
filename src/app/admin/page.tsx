'use client'

import { useState, useEffect, useCallback } from 'react'

const ADMIN_USERNAME = 'admin'

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

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [adminKey, setAdminKey] = useState('')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [selected, setSelected] = useState<Submission | null>(null)
  const [results, setResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  useEffect(() => {
    const key = sessionStorage.getItem('admin_key')
    if (key) {
      setAdminKey(key)
      setAuthed(true)
    }
  }, [])

  const fetchSubmissions = useCallback(async (key: string) => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/admin/submissions', {
        headers: { 'x-admin-key': key },
      })
      if (!res.ok) throw new Error('Failed to load submissions')
      setSubmissions(await res.json())
    } catch (err: any) {
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed && adminKey) fetchSubmissions(adminKey)
  }, [authed, adminKey, fetchSubmissions])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (username !== ADMIN_USERNAME) {
      setLoginError('Invalid credentials')
      return
    }
    fetch('/api/admin/submissions', {
      headers: { 'x-admin-key': password },
    }).then(res => {
      if (res.ok) {
        sessionStorage.setItem('admin_key', password)
        setAdminKey(password)
        setAuthed(true)
      } else {
        setLoginError('Invalid credentials')
      }
    })
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_key')
    setAuthed(false)
    setAdminKey('')
    setSubmissions([])
    setSelected(null)
    setResults(null)
  }

  async function handleViewResults(sub: Submission) {
    setSelected(sub)
    setResults(null)
    setResultsLoading(true)
    try {
      const res = await fetch(`/api/admin/submissions/${sub.id}/results`, {
        headers: { 'x-admin-key': adminKey },
      })
      const data = await res.json()
      setResults(data.summary)
    } catch {
      setResults(null)
    } finally {
      setResultsLoading(false)
    }
  }

  // ── Login ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Admin Panel</h1>
          <p className="text-sm text-slate-400 mb-6">Etijah Career Compass</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Results detail panel ──────────────────────────────
  if (selected) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
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

  // ── Submissions list ──────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-800">Admin Panel</h1>
          <p className="text-xs text-slate-400">Assessment Submissions</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchSubmissions(adminKey)}
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
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {fetchError && (
          <p className="text-red-500 text-sm text-center py-8">{fetchError}</p>
        )}

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
                  {submissions.map((sub, i) => (
                    <tr key={sub.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{sub.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{sub.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{sub.country || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{sub.current_stage?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(sub.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.completed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                          {sub.completed ? 'Complete' : 'Incomplete'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewResults(sub)}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          View results →
                        </button>
                      </td>
                    </tr>
                  ))}
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
      </div>
    </div>
  )
}
