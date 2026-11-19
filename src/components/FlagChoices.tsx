'use client'

// Country / nationality as a grid of flag tiles: tap the flag instead of reading a list of names. Real flag images
// (public/flags) so they look the same on every device. Options without a flag (other country, other region) get a globe.

import { FLAG_FILES, optionEmoji } from '@/data/optionIcons'

export default function FlagChoices({
  qid, options, selected, onPick,
}: {
  qid: string
  options: { value: string; label: string }[]   // label = the translated country / nationality name
  selected: string | undefined
  onPick: (value: string) => void
}) {
  const flags = FLAG_FILES[qid] ?? {}
  const anyPicked = !!selected
  return (
    <div className="ftiles">
      {options.map(o => {
        const on = selected === o.value
        const file = flags[o.value]
        return (
          <button
            key={o.value}
            type="button"
            className={`ftile ${on ? 'sel' : ''} ${anyPicked && !on ? 'dim' : ''}`}
            aria-pressed={on}
            onClick={() => onPick(o.value)}
          >
            <span className="ftile-pic">
              {file
                // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed
                ? <img src={`/flags/${file}.svg`} alt="" width={64} height={48} loading="eager" draggable={false} />
                : <span className="ftile-globe" aria-hidden="true">{optionEmoji(qid, o.value) ?? '🌐'}</span>}
            </span>
            <span className="ftile-label">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
