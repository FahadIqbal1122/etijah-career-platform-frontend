'use client'

// WallOfDirection — a slow, staggered carousel of user stories near the end of the landing page, so visitors who
// skipped the hero reviews can read them again. Copy comes from L[locale].wall (src/data/landing.ts).
// The cards drift sideways on their own (pauses on hover/focus); reduced-motion users get a plain swipeable row.

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

// each card sits at its own height; indexed by position so the second (looping) copy lines up with the first
const STAGGER = [0, 64, 18, 82, 36, 100, 8, 56]

function Card({ x, i, dir, hidden }: { x: WallItem; i: number; dir: string; hidden?: boolean }) {
  return (
    <article className={`wd-card wd-${x.kind}`} dir={dir} aria-hidden={hidden || undefined} style={{ marginTop: STAGGER[i % STAGGER.length] }}>
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
  )
}

export default function WallOfDirection({ copy, dir }: { copy: any; dir: string }) {
  const items: WallItem[] = copy.items

  return (
    <div>
      <div className="site-wrap">
        <p className="eyebrow landing-eyebrow wd-eyebrow">{copy.eyebrow}</p>
        <h2 className="wd-h">
          {copy.headline[0]}<br /><span className="wd-hl">{copy.headline[1]}</span>
        </h2>
      </div>

      <div className="wd-viewport" tabIndex={0} aria-label={copy.eyebrow}>
        <div className="wd-track">
          {items.map((x, i) => <Card key={`a${i}`} x={x} i={i} dir={dir} />)}
          {/* second copy makes the loop seamless */}
          {items.map((x, i) => <Card key={`b${i}`} x={x} i={i} dir={dir} hidden />)}
        </div>
      </div>
    </div>
  )
}
