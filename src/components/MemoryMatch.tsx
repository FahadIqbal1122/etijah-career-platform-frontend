'use client'

// Small flip-card pairs game — one of the break-panel activities.

import { useState } from 'react'
import { breakCopy, MEMORY_SYMBOLS, Bi } from '@/data/breakActivities'

function t(bi: Bi, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? bi.ar : bi.en
}

function shuffledDeck(): string[] {
  const deck = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

interface Props { locale: 'en' | 'ar' }

export default function MemoryMatch({ locale }: Props) {
  const [deck, setDeck] = useState<string[]>(shuffledDeck)
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  const allMatched = matched.length === deck.length

  function flip(i: number) {
    if (busy || open.includes(i) || matched.includes(i) || open.length === 2) return
    const next = [...open, i]
    setOpen(next)
    if (next.length === 2) {
      setBusy(true)
      const [a, b] = next
      if (deck[a] === deck[b]) {
        window.setTimeout(() => {
          setMatched(m => [...m, a, b])
          setOpen([])
          setBusy(false)
        }, 300)
      } else {
        window.setTimeout(() => {
          setOpen([])
          setBusy(false)
        }, 700)
      }
    }
  }

  function reset() {
    setDeck(shuffledDeck())
    setOpen([])
    setMatched([])
    setBusy(false)
  }

  return (
    <>
      <div className="mm-grid">
        {deck.map((sym, i) => {
          const shown = open.includes(i) || matched.includes(i)
          return (
            <button
              key={i}
              type="button"
              className={`mm-card ${shown ? 'flipped' : ''} ${matched.includes(i) ? 'matched' : ''}`}
              onClick={() => flip(i)}
            >
              {shown ? sym : ''}
            </button>
          )
        })}
      </div>
      {allMatched && (
        <>
          <div className="assess-break-status">{t(breakCopy.allMatched, locale)}</div>
          <div className="assess-break-row">
            <button type="button" className="assess-break-action ghost" onClick={reset}>
              {t(breakCopy.playAgain, locale)}
            </button>
          </div>
        </>
      )}
    </>
  )
}
