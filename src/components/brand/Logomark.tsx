// Logomark — the official Etijahi "Constellation" logomark.
// A1 · Original: fine gradient line rising through graded nodes to a
// single haloed destination star. Ported from Design/src/logomark.jsx.
//
//   tone: 'light' → blue path + teal star  (on white / #EBF3FF)
//         'dark'  → white path + teal star (on Primary Blue / charcoal)

import { useId } from 'react'
import { useLocale } from 'next-intl'

type LogomarkProps = {
  size?: number
  tone?: 'light' | 'dark'
  star?: string
  glow?: boolean
  className?: string
  title?: string
}

export default function Logomark({
  size = 30,
  tone = 'light',
  star = '#00C9A7',
  glow = false,
  className = '',
  title = 'Etijahi',
}: LogomarkProps) {
  const path = tone === 'dark' ? '#FFFFFF' : '#0052CC'
  const mid = tone === 'dark' ? '#FFFFFF' : '#0091C2'
  const gradId = useId()

  return (
    <svg
      className={`logomark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label={title}
      style={glow ? { filter: `drop-shadow(0 1px 4px ${star}55)`, overflow: 'visible' } : { overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="18" y1="102" x2="100" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={path} />
          <stop offset="1" stopColor={star} />
        </linearGradient>
      </defs>
      <path
        d="M20 100 L44 68 L72 78 L98 22"
        stroke={`url(#${gradId})`}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={20} cy={100} r={7} fill={path} opacity={0.45} />
      <circle cx={44} cy={68} r={9} fill={path} opacity={0.7} />
      <circle cx={72} cy={78} r={8} fill={mid} opacity={0.85} />
      <circle cx={98} cy={22} r={22} stroke={star} strokeWidth={3} fill="none" opacity={0.4} />
      <circle cx={98} cy={22} r={14} fill={star} />
    </svg>
  )
}

// Full lockup: logomark + wordmark, name shown in the active locale only.
// `tone='dark'` for use on the brand gradient; `tone='light'` on white surfaces.
export function Wordmark({ tone = 'light', size = 30 }: { tone?: 'light' | 'dark'; size?: number }) {
  const locale = useLocale()
  const ink = tone === 'dark' ? '#FFFFFF' : '#0770BA'
  const name = locale === 'ar' ? 'إتجاهي' : 'Etijahi'
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logomark size={size} tone={tone} />
      <span
        className={locale === 'ar' ? 'font-sans' : undefined}
        style={{ color: ink, fontWeight: 800, fontSize: size * 0.6, lineHeight: 1 }}
      >
        {name}
      </span>
    </span>
  )
}
