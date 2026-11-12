'use client'

// Admin, Coach tab: every coach line (welcome, goal replies, check-ins, pay gate lines and questions, the pay screen headline)
// with its built-in wording. Type in a box to replace a line; clear the box to go back to the built-in wording. Nothing is
// released: saved lines show on the live site within seconds. The brief's rules are checked on save (no "free", no em dashes).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { scriptCatalogue } from '@/data/coachScript'

type Over = Record<string, { en?: string; ar?: string }>

export default function CoachMessagesEditor() {
  const rows = useMemo(() => scriptCatalogue(), [])
  const groups = useMemo(() => ['All', ...Array.from(new Set(rows.map(r => r.group)))], [rows])
  const [group, setGroup] = useState('All')
  const [over, setOver] = useState<Over>({})
  const [high, setHigh] = useState('4.5')
  const [low, setLow] = useState('2.5')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {   // loading starts true, so nothing to set before the request
    try {
      const res = await fetch('/api/admin/coach-script')
      if (!res.ok) throw new Error('Could not load the saved lines')
      const d = await res.json()
      setOver(d.messages ?? {})
      setHigh(String(d.trait_high ?? 4.5)); setLow(String(d.trait_low ?? 2.5))
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load' }) }
    finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the saved lines once; state is only set after the request returns
  useEffect(() => { load() }, [load])

  function setText(id: string, lang: 'en' | 'ar', text: string) {
    setOver(o => ({ ...o, [id]: { ...o[id], [lang]: text } }))
  }
  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/coach-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: over, trait_high: Number(high), trait_low: Number(low) }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'Could not save')
      setOver(d.messages ?? {})
      setMsg({ ok: true, text: 'Saved. The live site picks it up within a few seconds.' })
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save' }) }
    finally { setSaving(false) }
  }

  const shown = rows.filter(r => group === 'All' || r.group === group)
  const edited = Object.values(over).filter(v => v.en || v.ar).length
  const field = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400'

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Coach messages</h2>
      <p className="text-sm text-slate-400 mb-4">
        Every line Sarah says, keyed by the brief&apos;s message IDs. The grey text under each box is the built-in wording.
        Type to replace it, clear the box to go back. Placeholders in {'{curly brackets}'} are filled by the site. Never use
        &quot;free&quot; / مجاناً and no em dashes (checked when you save). {edited} line{edited === 1 ? '' : 's'} edited.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-1">Work-style thresholds for the personal hints</p>
        <p className="text-xs text-slate-400 mb-3">Scores run 1 to 6. A trait counts as high at or above the first number and low at or below the second.</p>
        <div className="flex gap-3 items-center">
          <label className="text-xs text-slate-500">High from <input value={high} onChange={e => setHigh(e.target.value)} inputMode="decimal" className="ml-1 w-16 rounded border border-slate-200 px-2 py-1 text-sm" /></label>
          <label className="text-xs text-slate-500">Low up to <input value={low} onChange={e => setLow(e.target.value)} inputMode="decimal" className="ml-1 w-16 rounded border border-slate-200 px-2 py-1 text-sm" /></label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {groups.map(g => (
          <button key={g} onClick={() => setGroup(g)} className={`rounded-full px-3 py-1 text-xs font-semibold ${group === g ? 'bg-lime-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{g}</button>
        ))}
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-3">
          {shown.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold text-slate-600 mb-2">{r.label} <span className="font-normal text-slate-400">({r.id})</span></p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <textarea rows={3} value={over[r.id]?.en ?? ''} onChange={e => setText(r.id, 'en', e.target.value)} placeholder={r.en} className={field} dir="ltr" />
                </div>
                <div>
                  <textarea rows={3} value={over[r.id]?.ar ?? ''} onChange={e => setText(r.id, 'ar', e.target.value)} placeholder={r.ar} className={field} dir="rtl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-slate-200 mt-6 py-3 flex items-center gap-3">
        <button onClick={save} disabled={saving || loading} className="rounded-lg bg-lime-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save all'}</button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      </div>
    </div>
  )
}
