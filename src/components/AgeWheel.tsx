'use client'

// Scroll wheel for the age question. Produces the same string the number box did (valid range 10–100).
// The wheel starts near a typical age for orientation, but nothing is recorded until the person scrolls
// or taps a number, so the preset never becomes an answer by accident.

import { useEffect, useRef, useState } from 'react'

const MIN = 10
const MAX = 100
const ROW = 48
const START = 25
const AGES = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i)

export default function AgeWheel({
  value, onChange, hint, typeLabel, onType,
}: {
  value: string
  onChange: (v: string) => void
  hint: string
  typeLabel: string
  onType: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const programmatic = useRef(true) // true while the initial positioning scroll settles
  const timer = useRef<number>(0)
  const [idx, setIdx] = useState(() => {
    const n = Number(value)
    return (Number.isInteger(n) && n >= MIN && n <= MAX ? n : START) - MIN
  })

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = idx * ROW
    const t = window.setTimeout(() => { programmatic.current = false }, 250)
    return () => { window.clearTimeout(t); window.clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- positions the wheel once, on mount
  }, [])

  function onScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.max(0, Math.min(MAX - MIN, Math.round(el.scrollTop / ROW)))
    setIdx(i)
    if (programmatic.current) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(String(MIN + i)), 140)
  }

  function tap(i: number) {
    programmatic.current = false
    ref.current?.scrollTo({ top: i * ROW, behavior: 'smooth' })
    onChange(String(MIN + i))
  }

  const chosen = value !== '' && Number(value) === MIN + idx

  return (
    <div className="age-wheel-box">
      <p className="age-hint">{hint}</p>
      <div className={`age-wheel-wrap ${chosen ? 'chosen' : ''}`}>
        <div className="age-wheel" ref={ref} onScroll={onScroll} tabIndex={0} role="listbox" aria-label={hint}>
          {AGES.map((a, i) => (
            <div
              key={a}
              role="option"
              aria-selected={i === idx}
              className={`age-item ${i === idx ? 'cur' : ''}`}
              onClick={() => tap(i)}
            >
              {a}
            </div>
          ))}
        </div>
        <div className="age-band" />
      </div>
      <button type="button" className="age-type" onClick={onType}>{typeLabel}</button>
    </div>
  )
}
