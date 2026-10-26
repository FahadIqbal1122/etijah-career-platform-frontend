'use client'

// HeroStories — landing hero. Left: a short intro to Etijahi (headline, a few lines, CTAs). Right: a stack of user
// reviews that rotates by itself (pauses on hover/focus and under reduced motion; the dots and arrows also work).
// Review copy comes from L[locale].hero.stories (src/data/landing.ts); every review there is a placeholder for now.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const ROTATE_MS = 5200
const SHOWN = 3
const PAD = 36 // vertical padding of a card (matches .hx-card)
const SMALL = 140 // height of the two smaller cards behind the front one
const GAP = 12

interface Story {
  quote: string
  name: string
  meta: string
  initial: string
  rows?: string[][]
}

interface Props {
  copy: any
  dir: 'ltr' | 'rtl'
  eyebrow: string
  headline: ReactNode
  about: string
  children: ReactNode // CTAs + microcopy, rendered under the intro
}

export default function HeroStories({ copy, dir, eyebrow, headline, about, children }: Props) {
  const items: Story[] = copy.items
  const n = items.length
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [h0, setH0] = useState(200) // height of the front card = its own content
  const [hMax, setHMax] = useState(260) // tallest front card of all reviews: reserves a fixed height so the page never moves
  const inner = useRef<(HTMLDivElement | null)[]>([])
  const meas = useRef<(HTMLDivElement | null)[]>([])
  const [back, fwd] = dir === 'rtl' ? ['→', '←'] : ['←', '→']

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])
  useEffect(() => {
    if (paused || reduced || n < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % n), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, reduced, n])

  // size the front card to its own review so short quotes don't leave empty space
  useLayoutEffect(() => {
    const measure = () => {
      const el = inner.current[i]
      if (el) setH0(el.offsetHeight + PAD)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [i])

  // measure every review once (hidden copies, full quote) so the stack always reserves room for the tallest one;
  // otherwise the banner changes height with each review and everything below it jumps
  useLayoutEffect(() => {
    const measure = () => setHMax(Math.max(120, ...meas.current.map((el) => (el ? el.offsetHeight : 0))) + PAD)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [n])

  const go = (d: number) => setI((x) => (x + d + n) % n)

  return (
    <div className="hx-grid">
      <p className="eyebrow landing-eyebrow hx-eyebrow">{eyebrow}</p>
      <h1 className="hx-headline">{headline}</h1>
      <p className="hx-about">{about}</p>

      <div
        className="hx-right"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {/* the constellation now lives in the banner background (HeroField) */}
        <div className="hx-panel">
          <div className="hx-badge">
            <span className="hx-badge-dot" />
            {copy.rating ? `${copy.rating.score} / 5 · ${copy.rating.count} ${copy.reviewsFrom}` : copy.eyebrow}
          </div>

          {/* every card stays mounted and slides between slots (data-pos), so changes animate instead of re-appearing */}
          <div className="hx-list" aria-live="off" style={{ height: Math.max(hMax, h0) + GAP + SMALL + GAP + SMALL }}>
            {/* hidden copies used only to measure the tallest review */}
            <div className="hx-measure" aria-hidden="true">
              {items.map((s, k) => (
                <div key={k} className="hx-m">
                  <div ref={(el) => { meas.current[k] = el }}>
                    <div className="hx-card-top"><span className="hx-av" /><div className="hx-card-who"><p className="hx-name">{s.name}</p><p className="hx-meta">{s.meta}</p></div></div>
                    <p className="hx-quote">{s.quote}</p>
                  </div>
                </div>
              ))}
            </div>
            {items.map((s, idx) => {
              const rel = (idx - i + n) % n
              const pos = rel < SHOWN ? String(rel) : rel === n - 1 ? 'out' : 'wait'
              const slot: Record<string, { y: number; h: number }> = {
                '0': { y: 0, h: h0 },
                '1': { y: h0 + GAP, h: SMALL },
                '2': { y: h0 + GAP + SMALL + GAP, h: SMALL },
                out: { y: -70, h: h0 },
                wait: { y: h0 + GAP + SMALL + GAP + SMALL + 40, h: SMALL },
              }
              const { y, h } = slot[pos]
              return (
                <article key={idx} className="hx-card" data-pos={pos} aria-hidden={pos !== '0'} style={{ transform: `translateY(${y}px)`, height: h }}>
                  <div ref={(el) => { inner.current[idx] = el }}>
                  <div className="hx-card-top">
                    <span className="hx-av">{s.initial}</span>
                    <div className="hx-card-who">
                      <p className="hx-name"><bdi>{s.name}</bdi></p>
                      <p className="hx-meta">{s.meta}</p>
                    </div>
                  </div>
                  <p className="hx-quote">{s.quote}</p>
                  {(s.rows?.length ?? 0) > 0 && (
                    <div className="hx-report">
                      <p className="hx-report-h">{copy.fromReport}</p>
                      {(s.rows ?? []).map(([k, v]) => (
                        <div key={k} className="hx-row"><span>{k}</span><b>{v}</b></div>
                      ))}
                    </div>
                  )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="hx-controls">
            <span className="hx-verified">{copy.verified}</span>
            <span className="hx-dots" role="tablist">
              {items.map((_, k) => (
                <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`${copy.story} ${k + 1}`} className={`hx-dot ${k === i ? 'on' : ''}`} onClick={() => setI(k)} />
              ))}
            </span>
            <span className="hx-arrows">
              <button type="button" onClick={() => go(-1)} aria-label={copy.prev} className="hs-arrow">{back}</button>
              <button type="button" onClick={() => go(1)} aria-label={copy.next} className="hs-arrow solid">{fwd}</button>
            </span>
          </div>
        </div>
      </div>

      <div className="hx-ctas">{children}</div>
    </div>
  )
}
