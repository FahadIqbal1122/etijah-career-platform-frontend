'use client'

// Icon tiles for pick-several questions (sectors). Same values in, same values out as the plain pill list —
// only the look changes: a scannable grid with an icon per option.

const ICONS: Record<string, string> = {
  technology: '💻', healthcare: '🏥', finance: '🏦', government: '🏛️', energy: '⚡', hospitality: '🏨',
  education: '🎓', creative: '🎨', consulting: '💼', real_estate: '🏢', logistics: '🚚', retail: '🛍️',
  sports: '⚽', nonprofit: '🤝', other: '✍️', not_sure: '🤔',
}

export default function IconTiles({
  options, selected, onToggle,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="tiles">
      {options.map(opt => {
        const on = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            className={`tile ${on ? 'sel' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(opt.value)}
          >
            <span className="tile-ic" aria-hidden="true">{ICONS[opt.value] ?? '•'}</span>
            <span className="tile-label">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
