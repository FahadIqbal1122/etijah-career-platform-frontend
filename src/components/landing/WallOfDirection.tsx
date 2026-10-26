'use client'

// WallOfDirection — uneven masonry of user stories near the end of the landing page, so visitors who skipped the
// hero reviews can read them again. Copy comes from L[locale].wall (src/data/landing.ts).
// Cards are dealt out one per column and keep their own height. They rise in one after another when the section
// scrolls into view, then float gently and lift on hover (all off for reduced-motion users).

import { useEffect, useRef, useState } from 'react'

interface WallItem {
  kind: 'feature' | 'quote' | 'plain'
  text: string
  name: string
  tag: string
  place: string
}

const Quotes = () => (
  <svg viewBox="0 0 32 24" width="34" height="26" fill="currentColor" aria-hidden="true">
    <path d="M0 24V13.6C0 6 4 1 11.2 0l1.6 3.6C9.2 4.8 7.6 7 7.4 10H13v14H0zm18.4 0V13.6C18.4 6 22.4 1 29.6 0L31.2 3.6C27.6 4.8 26 7 25.8 10h5.6v14h-13z" />
  </svg>
)

// column count follows the viewport (matches the breakpoints in globals.css); 3 on the server
function useColumns() {
  const [n, setN] = useState(3)
  useEffect(() => {
    const calc = () => setN(window.innerWidth >= 1000 ? 3 : window.innerWidth >= 640 ? 2 : 1)
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return n
}

function Card({ x, dir, order, shown }: { x: WallItem; dir: string; order: number; shown: boolean }) {
  return (
    <div className="wd-bob" style={{ animationDelay: `${(order % 5) * -1.3}s`, animationDuration: `${6 + (order % 3)}s` }}>
      <article
        className={`wd-card wd-${x.kind} ${shown ? 'in' : ''}`}
        dir={dir}
        style={{ transitionDelay: shown ? `${order * 120}ms` : '0ms' }}
      >
        {x.kind === 'quote' && <span className="wd-qmark"><Quotes /></span>}
        {x.kind === 'plain' && <p className="wd-tag">{x.tag}</p>}
        <p className={x.kind === 'plain' ? 'wd-text' : 'wd-big'}>{x.text}</p>
        {x.kind === 'plain' ? (
          <div className="wd-who">
            <span className="wd-av">{x.name.replace(/[[\]]/g, '').charAt(0)}</span>
            <div><p className="wd-name"><bdi>{x.name}</bdi></p><p className="wd-place">{x.place}</p></div>
          </div>
        ) : (
          <div className="wd-foot">
            <p className="wd-name"><bdi>{x.name}</bdi></p>
            <p className="wd-place">{x.tag}, {x.place}</p>
          </div>
        )}
      </article>
    </div>
  )
}

export default function WallOfDirection({ copy, dir }: { copy: any; dir: string }) {
  const items: WallItem[] = copy.items
  const cols = useColumns()
  const lanes: { x: WallItem; order: number }[][] = Array.from({ length: cols }, () => [])
  items.forEach((x, i) => lanes[i % cols].push({ x, order: i }))

  // reveal once, when the section first scrolls into view
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setShown(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="site-wrap">
      <p className="eyebrow landing-eyebrow wd-eyebrow">{copy.eyebrow}</p>
      <h2 className="wd-h">
        {copy.headline[0]}<br /><span className="wd-hl">{copy.headline[1]}</span>
      </h2>

      <div className="wd-cols" ref={ref}>
        {lanes.map((lane, li) => (
          <div key={li} className="wd-lane">
            {lane.map(({ x, order }) => <Card key={order} x={x} dir={dir} order={order} shown={shown} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
