'use client'

// Searchable multi-select dropdown for the languages question. Arabic, English, French, Spanish and German come
// first, in that order; every other language follows in alphabetical order for the current UI language, and
// "Other" is always last — so none of the remaining languages is ranked above another.

import { useMemo, useRef, useState } from 'react'

const PINNED = ['arabic', 'english', 'french', 'spanish', 'german']

export default function LanguageSelect({
  options, selected, onToggle, locale, searchPlaceholder, noMatch,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  locale: string
  searchPlaceholder: string
  noMatch: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)

  const sorted = useMemo(() => {
    const pinned = PINNED.map(v => options.find(o => o.value === v)).filter(Boolean) as typeof options
    const other = options.find(o => o.value === 'other')
    const rest = options
      .filter(o => !PINNED.includes(o.value) && o.value !== 'other')
      .sort((a, b) => a.label.localeCompare(b.label, locale))
    return [...pinned, ...rest, ...(other ? [other] : [])]
  }, [options, locale])

  const q = query.trim().toLowerCase()
  const shown = q ? sorted.filter(o => o.label.toLowerCase().includes(q)) : sorted
  const chips = sorted.filter(o => selected.includes(o.value))

  return (
    <div
      ref={box}
      style={{ position: 'relative' }}
      onBlur={e => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false) }}
    >
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {chips.map(o => (
            <button key={o.value} type="button" className="pill sel" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => onToggle(o.value)}>
              <span className="pill-label">{o.label} ×</span>
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
            marginTop: 6, maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line-strong)',
            borderRadius: 12, background: 'var(--surface, #fff)', padding: 6,
          }}
        >
          {shown.length === 0 && <p style={{ padding: 10, margin: 0, opacity: 0.7 }}>{noMatch}</p>}
          {shown.map(o => {
            const on = selected.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                className={`pill ${on ? 'sel' : ''}`}
                style={{ width: '100%', marginBottom: 4 }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onToggle(o.value)}
              >
                <span className="pill-check">{on && '✓'}</span>
                <span className="pill-label">{o.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
