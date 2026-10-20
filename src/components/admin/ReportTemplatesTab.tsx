'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  REPORT_TEMPLATES, ReportTemplateView, isReportTemplateId, sampleTemplateData,
  type ReportTemplateId,
} from '@/components/report-templates'

// Report templates: preview each presentation of the results report and choose which one is live.
export default function ReportTemplatesTab() {
  const [live, setLive] = useState<ReportTemplateId | null>(null)
  const [selected, setSelected] = useState<ReportTemplateId>('clarity')
  const [plan, setPlan] = useState<'free' | 'paid'>('free')
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [reportId, setReportId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/report-template')
      if (!res.ok) throw new Error('Failed to load the report template setting')
      const d = await res.json()
      setLive(isReportTemplateId(d.template) ? d.template : 'default')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function makeLive(id: ReportTemplateId) {
    const name = REPORT_TEMPLATES.find(t => t.id === id)?.name || id
    if (!window.confirm(`Make "${name}" the report every visitor sees? This affects production immediately.`)) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/report-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: id }),
      })
      if (!res.ok) throw new Error('Failed to save the report template')
      const d = await res.json()
      setLive(isReportTemplateId(d.template) ? d.template : 'default')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const info = REPORT_TEMPLATES.find(t => t.id === selected) || REPORT_TEMPLATES[0]
  const data = useMemo(() => sampleTemplateData(lang, plan === 'paid'), [lang, plan])
  const cleanId = reportId.trim()
  const realLink = cleanId ? `/results/${encodeURIComponent(cleanId)}?template=${selected}` : ''

  const seg = (active: boolean) => `px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Report templates</h2>
      <p className="text-sm text-slate-400 mb-6">
        Choose how the results report looks. A template is a full-page design; what the free and paid plans see or
        don't see is the same in every template. Previews use sample data. On the live report the detailed sections
        (plan, jobs, courses and so on) follow below the template.
      </p>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {REPORT_TEMPLATES.map(t => {
          const isLive = live === t.id
          const isSel = selected === t.id
          return (
            <div key={t.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 ${isSel ? 'border-fuchsia-500 ring-2 ring-fuchsia-100' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <span className="grid grid-cols-2 w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0" aria-hidden="true">
                  {t.swatch.map((c, i) => <i key={i} style={{ background: c }} />)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 leading-tight">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.tagline}</p>
                </div>
                {isLive && <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>}
              </div>
              <p className="text-sm text-slate-500 flex-1">{t.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {t.tags.map(tag => <span key={tag} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{tag}</span>)}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(t.id)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${isSel ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {isSel ? 'Previewing' : 'Preview'}
                </button>
                <button
                  disabled={loading || saving || isLive || live === null}
                  onClick={() => makeLive(t.id)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {isLive ? 'Live' : 'Make live'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="font-semibold text-slate-800">{info.name} preview</p>
          {selected !== 'default' && (
            <>
              <div className="flex gap-1" role="group" aria-label="Plan">
                <button className={seg(plan === 'free')} onClick={() => setPlan('free')}>Free plan</button>
                <button className={seg(plan === 'paid')} onClick={() => setPlan('paid')}>Paid plan</button>
              </div>
              <div className="flex gap-1" role="group" aria-label="Language">
                <button className={seg(lang === 'en')} onClick={() => setLang('en')}>English</button>
                <button className={seg(lang === 'ar')} onClick={() => setLang('ar')}>العربية</button>
              </div>
              <div className="flex gap-1" role="group" aria-label="Device">
                <button className={seg(device === 'desktop')} onClick={() => setDevice('desktop')}>Desktop</button>
                <button className={seg(device === 'phone')} onClick={() => setDevice('phone')}>Phone</button>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <input
            value={reportId}
            onChange={e => setReportId(e.target.value)}
            placeholder="Paste a report (response) id to open it with this template"
            className="flex-1 min-w-[240px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <a
            href={realLink || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!realLink}
            className={`px-3 py-2 rounded-lg text-sm font-semibold ${realLink ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-400 pointer-events-none'}`}
          >
            Open real report ↗
          </a>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          The real-report link adds <span className="font-mono">?template={selected}</span> for you only; visitors keep seeing the live template.
        </p>
      </div>

      {selected === 'default' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-sm text-slate-600">
          The default template is the report page exactly as it runs today, so it is not drawn from sample data here.
          Paste a report id above and open it to see it, or make this template live to return every visitor to it.
        </div>
      ) : plan === 'free' ? (
        // The free plan is the two-part snapshot whatever template is live, so there is no template to preview for it
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-sm text-slate-600">
          The free plan is the same two-part snapshot in every template (interests, values, strengths and personality, each with a
          short explanation, and no career names). Sample free report:{' '}
          <a href="/demo-reports/free-en.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 underline">English PDF</a>
          {' · '}
          <a href="/demo-reports/free-ar.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 underline">Arabic PDF</a>.
          Switch to the paid plan to compare the templates.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:p-4">
          <div
            className="mx-auto bg-white rounded-xl shadow-sm overflow-auto"
            style={{ width: device === 'phone' ? 390 : '100%', maxWidth: '100%', maxHeight: 760 }}
          >
            <ReportTemplateView id={selected} data={data} />
          </div>
        </div>
      )}
    </div>
  )
}
