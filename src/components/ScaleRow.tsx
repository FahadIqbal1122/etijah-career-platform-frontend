'use client'

// The 6-step "how much does this sound like you" answer as one colour-graded row of tiles, from "nothing like me"
// (red-ish) to "exactly me" (green). Same values 1-6 as before; the labels are the same translated texts.
// The row follows the reading direction, so in Arabic "nothing like me" sits on the right.

export default function ScaleRow({
  values, selected, onPick, label,
}: {
  values: number[]                       // 1 (lowest) ... 6 (highest), in display order
  selected: number | string | undefined
  onPick: (value: number) => void
  label: (value: number) => string       // translated label for a step
}) {
  const lo = values[0]
  const hi = values[values.length - 1]
  const chosen = values.find(v => String(v) === String(selected))
  return (
    <div className="scale">
      <div className="scale-row" role="radiogroup">
        {values.map(v => {
          const on = chosen === v
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={label(v)}
              className={`scale-tile s${v} ${on ? 'sel' : ''}`}
              onClick={() => onPick(v)}
            >
              <span className="scale-dot" aria-hidden="true">{on ? '✓' : ''}</span>
            </button>
          )
        })}
      </div>
      <div className="scale-ends" aria-hidden="true">
        <span>{label(lo)}</span>
        <span>{label(hi)}</span>
      </div>
      <p className="scale-chosen" aria-live="polite">{chosen ? label(chosen) : ' '}</p>
    </div>
  )
}
