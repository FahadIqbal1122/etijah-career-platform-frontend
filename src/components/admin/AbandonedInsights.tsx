'use client'

// "Dropped off" tab: who the people who gave an email and never finished are (age group, country, nationality, stage,
// experience, language, reminder status, and when they dropped off), as the same charts the main dashboard uses.
// Click a slice, bar or day to open a popup listing exactly those people with how to reach them.
import { useEffect, useMemo, useState } from 'react'
import { ColumnChart, DonutChart, TrendChart, catColor, type ChartItem } from './DashCharts'

export type AbandonedPerson = {
  email: string
  full_name: string | null
  locale: string | null
  source: 'draft' | 'response'
  current_index: number | null
  total_questions: number | null
  progress_pct: number | null
  last_activity_at: string | null
  reminder_sent_at: string | null
  // from the autosaved answers; null / missing = they had not reached that question
  phone?: string | null
  country?: string | null
  country_other?: string | null
  nationality?: string | null
  nationality_other?: string | null
  age?: number | null
  age_bracket?: string | null
  experience_level?: string | null
  current_stage?: string | null
}

export type Category = { order: string[]; label: Record<string, string> }

type Props = {
  people: AbandonedPerson[]
  cats: { age: Category; country: Category; nationality: Category; stage: Category; experience: Category }
  ageToBracket: (age: number | null | undefined) => string | null
  stopOf: (p: AbandonedPerson) => { n: number; section: string; text: string } | null
}

const NONE = '__none'
const NONE_LABEL = 'Not answered yet'
const NONE_COLOR = '#cbd5e1'
const MAX_DAYS = 60

const pretty = (key: string) => key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA')
const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function csvCell(v: unknown) {
  const s = v == null ? '' : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function AbandonedInsights({ people, cats, ageToBracket, stopOf }: Props) {
  const [drill, setDrill] = useState<{ title: string; people: AbandonedPerson[] } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!drill) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrill(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drill])

  const bracketOf = (p: AbandonedPerson) => p.age_bracket ?? ageToBracket(p.age)

  // One chart = a title, how a person is bucketed, and the category labels. A person who has not reached that
  // question is counted as "Not answered yet" (a real, clickable item) so every chart adds up to everyone.
  const charts = useMemo(() => {
    type Def = { id: string; title: string; kind: 'donut' | 'column'; order: string[]; label: Record<string, string>; keyOf: (p: AbandonedPerson) => string | null | undefined }
    const defs: Def[] = [
      { id: 'age', title: 'Age group', kind: 'column', ...cats.age, keyOf: bracketOf },
      { id: 'country', title: 'Country', kind: 'donut', ...cats.country, keyOf: p => p.country },
      { id: 'nationality', title: 'Nationality', kind: 'donut', ...cats.nationality, keyOf: p => p.nationality },
      { id: 'stage', title: 'Current stage', kind: 'donut', ...cats.stage, keyOf: p => p.current_stage },
      { id: 'experience', title: 'Experience level', kind: 'column', ...cats.experience, keyOf: p => p.experience_level },
      { id: 'language', title: 'Language', kind: 'donut', order: ['ar', 'en'], label: { ar: 'Arabic', en: 'English' }, keyOf: p => p.locale },
      { id: 'reminder', title: 'Reminder status', kind: 'donut', order: ['unsent', 'sent'], label: { unsent: 'Not reminded yet', sent: 'Reminded' }, keyOf: p => (p.reminder_sent_at ? 'sent' : 'unsent') },
    ]
    return defs.map(d => {
      const counts: Record<string, number> = {}
      let missing = 0
      for (const p of people) {
        const k = d.keyOf(p)
        if (!k) { missing++; continue }
        counts[k] = (counts[k] || 0) + 1
      }
      const keys = [...d.order, ...Object.keys(counts).filter(k => !d.order.includes(k))]
      const items: ChartItem[] = keys.map((key, i) => ({ key, label: d.label[key] || pretty(key), value: counts[key] || 0, color: catColor(i) }))
      if (missing > 0) items.push({ key: NONE, label: NONE_LABEL, value: missing, color: NONE_COLOR })
      return { ...d, items, labelOf: (key: string) => (key === NONE ? NONE_LABEL : d.label[key] || pretty(key)) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, cats])

  // dropped off per day (the most recent MAX_DAYS days that have anyone)
  const days = useMemo(() => {
    const withDate = people.filter(p => p.last_activity_at)
    if (!withDate.length) return [] as { key: string; label: string; people: AbandonedPerson[] }[]
    const by = new Map<string, AbandonedPerson[]>()
    for (const p of withDate) {
      const k = dayKey(p.last_activity_at as string)
      by.set(k, [...(by.get(k) || []), p])
    }
    const keys = Array.from(by.keys()).sort()
    const out: { key: string; label: string; people: AbandonedPerson[] }[] = []
    const cur = new Date(`${keys[0]}T12:00:00`)
    const end = new Date(`${keys[keys.length - 1]}T12:00:00`)
    while (cur <= end && out.length < 400) {
      const k = cur.toLocaleDateString('en-CA')
      out.push({ key: k, label: dayLabel(k), people: by.get(k) || [] })
      cur.setDate(cur.getDate() + 1)
    }
    return out.slice(-MAX_DAYS)
  }, [people])

  const open = (title: string, list: AbandonedPerson[]) => {
    setCopied(false)
    setDrill({ title, people: [...list].sort((a, b) => (b.last_activity_at || '').localeCompare(a.last_activity_at || '')) })
  }

  if (!people.length) return null

  const labelOf = (map: Record<string, string>, key: string | null | undefined, other?: string | null) =>
    !key ? '—' : key === 'other' && other?.trim() ? `Other: ${other.trim()}` : map[key] || pretty(key)

  const copyEmails = async () => {
    if (!drill) return
    try {
      await navigator.clipboard.writeText(drill.people.map(p => p.email).join(', '))
      setCopied(true)
    } catch { /* clipboard blocked: nothing to do */ }
  }

  const downloadCsv = () => {
    if (!drill) return
    const rows = [
      ['Name', 'Email', 'Phone', 'Country', 'Nationality', 'Age', 'Current stage', 'Experience', 'Language', 'Stopped at', 'Progress %', 'Last activity', 'Reminder sent'],
      ...drill.people.map(p => {
        const st = stopOf(p)
        return [p.full_name, p.email, p.phone, labelOf(cats.country.label, p.country, p.country_other), labelOf(cats.nationality.label, p.nationality, p.nationality_other),
          p.age ?? (bracketOf(p) ? cats.age.label[bracketOf(p) as string] : ''), labelOf(cats.stage.label, p.current_stage), labelOf(cats.experience.label, p.experience_level),
          p.locale, st ? `Q${st.n} · ${st.section}` : '', p.progress_pct, p.last_activity_at ? new Date(p.last_activity_at).toLocaleString() : '',
          p.reminder_sent_at ? new Date(p.reminder_sent_at).toLocaleString() : '']
      }),
    ]
    const blob = new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dropped_off_${drill.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-700">Who dropped off</p>
        <p className="text-xs text-slate-400">Click any slice, bar or day to see exactly those people. Charts follow the “Last activity” filter above.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {charts.map(c => {
          const pick = (key: string) => people.filter(p => (c.keyOf(p) || NONE) === key)
          const onSelect = (key: string) => open(`${c.title}: ${c.labelOf(key)}`, pick(key))
          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">{c.title}</p>
              {c.kind === 'donut'
                ? <DonutChart items={c.items} total={people.length} centerLabel="people" onSelect={onSelect} />
                : <ColumnChart items={c.items} total={people.length} onSelect={onSelect} />}
            </div>
          )
        })}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:col-span-2">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Dropped off per day</p>
            <p className="text-xs text-slate-400">{people.length} {people.length === 1 ? 'person' : 'people'}</p>
          </div>
          <TrendChart
            points={days.map(d => ({ label: d.label, value: d.people.length }))}
            kind="column" color="#eda100" unit="people"
            onSelect={i => { const d = days[i]; if (d && d.people.length) open(`Last active on ${d.label}`, d.people) }}
          />
        </div>
      </div>

      {drill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDrill(null)}>
          <div role="dialog" aria-modal="true" aria-label={drill.title} className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 truncate">{drill.title}</h3>
                <p className="text-xs text-slate-400">{drill.people.length} {drill.people.length === 1 ? 'person' : 'people'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={copyEmails} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
                  {copied ? 'Copied ✓' : 'Copy emails'}
                </button>
                <button type="button" onClick={downloadCsv} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">Download CSV</button>
                <button type="button" onClick={() => setDrill(null)} aria-label="Close" className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2">×</button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    {['Name', 'Email', 'Phone', 'Country', 'Nationality', 'Age', 'Stage', 'Stopped at', 'Progress', 'Last active', 'Reminder'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drill.people.map((p, i) => {
                    const st = stopOf(p)
                    const br = bracketOf(p)
                    return (
                      <tr key={p.email} className={`border-t border-slate-50 ${i % 2 ? 'bg-slate-50/40' : ''}`}>
                        <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap" dir="auto">{p.full_name || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600"><a className="hover:underline" href={`mailto:${p.email}`}>{p.email}</a></td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap" dir="ltr">{p.phone ? <a className="hover:underline" href={`tel:${p.phone}`}>{p.phone}</a> : '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{labelOf(cats.country.label, p.country, p.country_other)}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{labelOf(cats.nationality.label, p.nationality, p.nationality_other)}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{p.age ?? (br ? cats.age.label[br] || br : '—')}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{labelOf(cats.stage.label, p.current_stage)}</td>
                        <td className="px-3 py-2.5 text-slate-500 max-w-[220px]">
                          {st ? <><span className="font-semibold text-slate-700">Q{st.n}</span> · {st.section}<span className="block truncate text-slate-400" title={st.text}>{st.text}</span></> : <span className="text-slate-400">unknown</span>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 tabular-nums whitespace-nowrap">{p.progress_pct != null ? `${p.progress_pct}%` : '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{p.last_activity_at ? new Date(p.last_activity_at).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{p.reminder_sent_at ? new Date(p.reminder_sent_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
