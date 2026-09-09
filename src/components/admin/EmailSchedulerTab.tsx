'use client'

import { useCallback, useEffect, useState } from 'react'

type EmailTemplate = { key: string; name: string; is_active: boolean }

type ScheduledEmail = {
  id: string
  template_key: string
  recipient_type: 'single' | 'segment'
  recipient_email: string | null
  recipient_name: string | null
  segment_key: string | null
  locale: string
  scheduled_for: string
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  sent_count: number
  failed_count: number
  error: string | null
  created_at: string
}

const SEGMENTS = [
  { key: 'beta_incomplete', label: 'Beta signups — assessment not completed' },
  { key: 'waitlist_all', label: 'Everyone on the waitlist' },
  { key: 'waitlist_no_assessment', label: 'Waitlist — has not done the assessment' },
  { key: 'waitlist_assessment_completed', label: 'Waitlist — completed the assessment' },
  { key: 'waitlist_assessment_no_feedback', label: 'Waitlist — completed assessment, not feedback' },
]

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  sending: 'bg-blue-50 text-blue-700',
  sent: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

// Bahrain is UTC+3 year-round (no DST). datetime-local gives us a naive
// "YYYY-MM-DDTHH:mm" string with no timezone — treat it as Bahrain local time
// and convert to a real UTC instant by attaching the +03:00 offset ourselves.
function bahrainLocalToUtcIso(datetimeLocal: string) {
  return new Date(`${datetimeLocal}:00+03:00`).toISOString()
}

function utcIsoToBahrainLabel(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Asia/Bahrain', dateStyle: 'medium', timeStyle: 'short',
  }) + ' Bahrain time'
}

export default function EmailSchedulerTab() {
  const [schedules, setSchedules] = useState<ScheduledEmail[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [templateKey, setTemplateKey] = useState('')
  const [recipientType, setRecipientType] = useState<'single' | 'segment'>('single')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [segmentKey, setSegmentKey] = useState(SEGMENTS[0].key)
  const [locale, setLocale] = useState<'en' | 'ar'>('en')
  const [scheduledFor, setScheduledFor] = useState('')

  const [segmentPreview, setSegmentPreview] = useState<{ count: number; sample: string[] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [schedRes, tmplRes] = await Promise.all([
        fetch('/api/admin/scheduled-emails'),
        fetch('/api/admin/email-templates'),
      ])
      if (!schedRes.ok) throw new Error('Failed to load scheduled emails')
      if (!tmplRes.ok) throw new Error('Failed to load email templates')
      const schedData = await schedRes.json()
      const tmplData = await tmplRes.json()
      setSchedules(schedData)
      setTemplates(tmplData)
      if (!templateKey && tmplData.length > 0) setTemplateKey(tmplData[0].key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (recipientType !== 'segment') {
      setSegmentPreview(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    fetch(`/api/admin/scheduled-emails/segment-preview?segment_key=${encodeURIComponent(segmentKey)}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error('preview failed')))
      .then(data => { if (!cancelled) setSegmentPreview(data) })
      .catch(() => { if (!cancelled) setSegmentPreview(null) })
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [recipientType, segmentKey])

  async function handleCreate() {
    if (!templateKey || !scheduledFor) {
      setError('Pick a template and a date/time')
      return
    }
    if (recipientType === 'single' && !recipientEmail) {
      setError('Enter a recipient email')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/scheduled-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_key: templateKey,
          recipient_type: recipientType,
          recipient_email: recipientType === 'single' ? recipientEmail : null,
          recipient_name: recipientType === 'single' ? recipientName : null,
          segment_key: recipientType === 'segment' ? segmentKey : null,
          locale,
          variables: {},
          scheduled_for: bahrainLocalToUtcIso(scheduledFor),
        }),
      })
      if (!res.ok) throw new Error('Failed to schedule email')
      setRecipientEmail('')
      setRecipientName('')
      setScheduledFor('')
      await fetchAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule email')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id: string) {
    try {
      const res = await fetch(`/api/admin/scheduled-emails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      await fetchAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/scheduled-emails/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      await fetchAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-4">Schedule a new email</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Template</label>
            <select
              value={templateKey}
              onChange={e => setTemplateKey(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {templates.map(t => (
                <option key={t.key} value={t.key}>{t.name}{!t.is_active ? ' (inactive)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Language</label>
            <select
              value={locale}
              onChange={e => setLocale(e.target.value as 'en' | 'ar')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setRecipientType('single')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${recipientType === 'single' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Single recipient
          </button>
          <button
            onClick={() => setRecipientType('segment')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${recipientType === 'segment' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Segment
          </button>
        </div>

        {recipientType === 'single' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Recipient email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">First name (for {'{{first_name}}'})</label>
              <input
                type="text"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-1">Segment</label>
            <select
              value={segmentKey}
              onChange={e => setSegmentKey(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              {previewLoading && 'Counting recipients…'}
              {!previewLoading && segmentPreview && (
                <>
                  Will send to <span className="font-semibold text-slate-700">{segmentPreview.count}</span> {segmentPreview.count === 1 ? 'person' : 'people'}
                  {segmentPreview.sample.length > 0 && (
                    <> — e.g. {segmentPreview.sample.join(', ')}{segmentPreview.count > segmentPreview.sample.length ? '…' : ''}</>
                  )}
                </>
              )}
              {!previewLoading && !segmentPreview && 'Could not load recipient count'}
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs text-slate-500 mb-1">Send at (Bahrain time)</label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={e => setScheduledFor(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Schedule
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Template</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scheduled for</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent / Failed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, i) => (
                <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.template_key}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {s.recipient_type === 'single'
                      ? s.recipient_email
                      : SEGMENTS.find(seg => seg.key === s.segment_key)?.label || s.segment_key}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{utcIsoToBahrainLabel(s.scheduled_for)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] || 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                    {s.error && <p className="text-[11px] text-red-500 mt-1 max-w-xs truncate" title={s.error}>{s.error}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.sent_count} / {s.failed_count}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {s.status === 'pending' && (
                      <button onClick={() => handleCancel(s.id)} className="text-xs text-amber-600 hover:text-amber-800 hover:underline font-semibold">
                        Cancel
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:text-red-700 hover:underline font-semibold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No scheduled emails yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
