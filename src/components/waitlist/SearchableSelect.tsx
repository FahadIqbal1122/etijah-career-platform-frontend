'use client'

import { useEffect, useRef, useState } from 'react'

// Type-to-filter combobox. Falls back to storing whatever the user typed if
// it doesn't match a listed option (allowCustom) — covers "my country/
// nationality isn't in the list" without a separate "Other" + text-input step.
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  allowCustom = true,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  allowCustom?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const match = options.find((o) => o.value === value)
    setQuery(match ? match.label : value || '')
  }, [value, options])

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  function commit(nextQuery: string) {
    const trimmed = nextQuery.trim()
    const exact = options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())
    // Guards against browser autofill dropping a phone number into this field
    // instead of the country/nationality the user actually typed.
    const looksLikePhoneNumber = /^\+?[\d\s()-]{6,}$/.test(trimmed)
    if (exact) {
      onChange(exact.value)
      setQuery(exact.label)
    } else if (allowCustom && trimmed && !looksLikePhoneNumber) {
      onChange(trimmed)
    } else {
      onChange('')
      setQuery('')
    }
  }

  function selectOption(o: { value: string; label: string }) {
    onChange(o.value)
    setQuery(o.label)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onBlur={() => {
          commit(query)
          setOpen(false)
        }}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-2xl border border-[var(--line-strong)] bg-white shadow-lg py-1.5">
          {filtered.slice(0, 60).map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectOption(o) }}
              className="w-full text-start px-4 py-2 text-sm text-charcoal hover:bg-teal/10 transition-colors"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
