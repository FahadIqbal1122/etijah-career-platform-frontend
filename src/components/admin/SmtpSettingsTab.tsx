'use client'

import { useCallback, useEffect, useState } from 'react'

type SmtpSettings = {
  host: string
  port: number
  user: string
  password: string
  from_email: string
  from_name: string
}

const EMPTY: SmtpSettings = { host: '', port: 465, user: '', password: '', from_email: '', from_name: '' }

export default function SmtpSettingsTab() {
  const [form, setForm] = useState<SmtpSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/smtp-settings')
      if (!res.ok) throw new Error('Failed to load SMTP settings')
      const data = await res.json()
      setForm({
        host: data.host || '',
        port: data.port || 465,
        user: data.user || '',
        password: '', // never prefill — masked placeholder only, real value stays server-side
        from_email: data.from_email || '',
        from_name: data.from_name || '',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load SMTP settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/admin/smtp-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save SMTP settings')
      setForm(prev => ({ ...prev, password: '' }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save SMTP settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl">
      <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-1">SMTP Settings</h2>
      <p className="text-xs text-slate-400 mb-5">
        Controls the mail server used to send report and feedback-request emails. Leave a field blank to fall back to the server&apos;s environment defaults.
      </p>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {saved && <p className="text-green-600 text-sm mb-3">Saved.</p>}

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Host</label>
            <input
              type="text"
              value={form.host}
              onChange={e => setForm(prev => ({ ...prev, host: e.target.value }))}
              placeholder="smtp.titan.email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Port</label>
            <input
              type="number"
              value={form.port}
              onChange={e => {
                const raw = e.target.value
                if (raw === '') return // ignore a momentarily-cleared field rather than coercing to NaN/null
                setForm(prev => ({ ...prev, port: Number(raw) }))
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Username</label>
          <input
            type="text"
            value={form.user}
            onChange={e => setForm(prev => ({ ...prev, user: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Leave blank to keep the existing password"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From Email</label>
            <input
              type="email"
              value={form.from_email}
              onChange={e => setForm(prev => ({ ...prev, from_email: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">From Name</label>
            <input
              type="text"
              value={form.from_name}
              onChange={e => setForm(prev => ({ ...prev, from_name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  )
}
