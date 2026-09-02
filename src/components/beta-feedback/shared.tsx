'use client'

import { FACE_EMOJIS, type Locale, type Option } from './content'

export function FaceScale({ label, note, value, onChange, locale }: {
  label: string
  note?: string
  value: number | undefined
  onChange: (v: number) => void
  locale: Locale
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-slate-700 mb-2.5">{label}</p>
      {note && <p className="text-[11px] text-slate-400 mb-2 -mt-1.5">{note}</p>}
      <div className="flex gap-2 justify-between" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        {FACE_EMOJIS.map((emoji, i) => {
          const n = i + 1
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 h-14 rounded-xl text-2xl border transition-colors ${
                value === n
                  ? 'bg-primary border-primary scale-105'
                  : 'bg-white border-slate-200 hover:border-primary'
              }`}
            >
              {emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Scale6({ label, note, low, high, value, onChange }: {
  label: string
  note?: string
  low: string
  high: string
  value: number | undefined
  onChange: (v: number) => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-3">
      <p className="text-sm font-medium text-slate-700 mb-1">{label}</p>
      {note && <p className="text-[11px] text-slate-400 mb-2">{note}</p>}
      <div className="flex gap-1.5 mt-2">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-11 rounded-lg text-sm font-medium border transition-colors ${
              value === n
                ? 'bg-primary border-primary text-white'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-primary hover:text-primary hover:bg-lightblue'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-slate-400">{low}</span>
        <span className="text-[11px] text-slate-400">{high}</span>
      </div>
    </div>
  )
}

export function PillSelect({ label, note, required, options, value, onChange, locale }: {
  label: string
  note?: string
  required?: boolean
  options: Option[]
  value: string | undefined
  onChange: (v: string) => void
  locale: Locale
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </p>
      {note && <p className="text-[11px] text-slate-400 mb-2">{note}</p>}
      <div className="flex flex-wrap gap-2 mt-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              value === opt.value
                ? 'bg-primary border-primary text-white font-medium'
                : 'border-slate-200 text-slate-500 bg-white hover:border-primary hover:text-primary'
            }`}
          >
            {opt.label[locale]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function MultiPillSelect({ label, options, value, onChange, locale }: {
  label: string
  options: Option[]
  value: string[]
  onChange: (v: string[]) => void
  locale: Locale
}) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }
  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-slate-700 mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              value.includes(opt.value)
                ? 'bg-primary border-primary text-white font-medium'
                : 'border-slate-200 text-slate-500 bg-white hover:border-primary hover:text-primary'
            }`}
          >
            {value.includes(opt.value) ? '✓ ' : ''}{opt.label[locale]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TextField({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-slate-700 mb-1.5">
        {label} <span className="text-slate-400 font-normal">(optional)</span>
      </p>
      <textarea
        className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:border-accent focus:ring-teal/15 transition-colors resize-y min-h-[70px] leading-relaxed"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
