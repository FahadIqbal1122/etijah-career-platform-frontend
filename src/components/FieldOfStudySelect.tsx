'use client'

// Searchable, grouped multi-select for "what are you studying / did you study". It replaces the old two-step flow
// (pick a broad field, then a specific area): every specific area is listed under its broad field and can be
// searched. Two extra entries sit below the groups: "I have not studied at university" and "Other (type your own)".

import { useMemo, useState } from 'react'

export type FieldGroup = { field: string; title: string; items: { value: string; label: string }[] }

export default function FieldOfStudySelect({
  groups, extras, selected, onToggle, searchPlaceholder, noMatch, extrasTitle,
}: {
  groups: FieldGroup[]
  extras: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  searchPlaceholder: string
  noMatch: string
  extrasTitle?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const shownGroups = useMemo(() => groups
    .map(g => ({
      ...g,
      // searching a group's name (e.g. "engineering") lists all of its areas
      items: q && !g.title.toLowerCase().includes(q) ? g.items.filter(i => i.label.toLowerCase().includes(q)) : g.items,
    }))
    .filter(g => g.items.length > 0), [groups, q])
  // the two extras stay visible whatever is typed, so "Other" is always one tap away when nothing matches
  const shownExtras = extras

  // chip text carries the broad field so "Other / not listed" reads as e.g. "Business: Other / not listed"
  const chipLabel = (value: string) => {
    const extra = extras.find(e => e.value === value)
    if (extra) return extra.label
    for (const g of groups) {
      const item = g.items.find(i => i.value === value)
      if (item) return `${g.title}: ${item.label}`
    }
    return value
  }

  const row = (value: string, label: string) => {
    const on = selected.includes(value)
    return (
      <button
        key={value}
        type="button"
        role="option"
        aria-selected={on}
        className={`pill ${on ? 'sel' : ''}`}
        style={{ width: '100%', marginBottom: 4 }}
        onMouseDown={e => e.preventDefault()}
        onClick={() => onToggle(value)}
      >
        <span className="pill-check">{on && '✓'}</span>
        <span className="pill-label">{label}</span>
      </button>
    )
  }

  return (
    <div
      style={{ position: 'relative' }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}
    >
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {selected.map(v => (
            <button key={v} type="button" className="pill sel" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => onToggle(v)}>
              <span className="pill-label">{chipLabel(v)} ×</span>
            </button>
          ))}
        </div>
      )}
      <input
        className="qinput"
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        placeholder={searchPlaceholder}
      />
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          tabIndex={-1}
          style={{
            marginTop: 6, maxHeight: 320, overflowY: 'auto', border: '1px solid var(--line-strong)',
            borderRadius: 12, background: 'var(--surface, #fff)', padding: 6,
          }}
        >
          {shownGroups.length === 0 && <p style={{ padding: 10, margin: 0, opacity: 0.7 }}>{noMatch}</p>}
          {shownGroups.map(g => (
            <div key={g.field}>
              <p style={{ margin: '10px 8px 6px', fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', opacity: 0.6 }}>{g.title}</p>
              {g.items.map(i => row(i.value, i.label))}
            </div>
          ))}
          {shownExtras.length > 0 && (
            // set apart from the fields above (own divider and heading) so "Other" and "I did not study" do not read as part of the last field
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '2px solid var(--line-strong)' }}>
              {extrasTitle && <p style={{ margin: '0 8px 8px', fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', opacity: 0.6 }}>{extrasTitle}</p>}
              {shownExtras.map(e => row(e.value, e.label))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
