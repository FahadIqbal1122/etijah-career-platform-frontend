'use client'

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

// A small tab on the side edge of the screen that brings Sarah back after someone pressed her cross. It sits
// halfway down the side, not in a bottom corner (a round button down there reads as customer service), and
// slides out a little on hover or focus.
export default function CoachSummon({ locale, onShow }: { locale: 'en' | 'ar'; onShow: () => void }) {
  const inBrowser = useSyncExternalStore(() => () => {}, () => true, () => false)
  if (!inBrowser) return null
  const label = locale === 'ar' ? 'أرجع سارة' : 'Bring Sarah back'
  return createPortal(
    <button type="button" className="coach-summon" dir={locale === 'ar' ? 'rtl' : 'ltr'} onClick={onShow} aria-label={label} title={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/coach-avatar.jpg" alt="" width={32} height={32} />
      <span>{locale === 'ar' ? 'سارة' : 'Sarah'}</span>
    </button>,
    document.body,
  )
}
