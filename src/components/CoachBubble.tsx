'use client'

import { useEffect, useState } from 'react'
import type { Bi } from '@/data/coachMessages'

interface Props {
  locale: 'en' | 'ar'
  message: Bi | null          // null = hidden
  onDismiss: () => void
  autoHideMs?: number         // 0 = stay until dismissed
}

export default function CoachBubble({ locale, message, onDismiss, autoHideMs = 9000 }: Props) {
  const [shown, setShown] = useState<Bi | null>(null)

  // keep text mounted during the fade-out (derived-state update during render)
  if (message && message !== shown) setShown(message)

  useEffect(() => {
    if (!message || !autoHideMs) return
    const id = setTimeout(onDismiss, autoHideMs)
    return () => clearTimeout(id)
  }, [message, autoHideMs, onDismiss])

  if (!shown) return null
  return (
    <div className={`coach-bubble ${message ? 'is-in' : 'is-out'}`} role="status" aria-live="polite"
         dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="coach-speech">
        <button className="coach-close" onClick={onDismiss} aria-label={locale === 'ar' ? 'إغلاق' : 'Dismiss'}>✕</button>
        <p>{locale === 'ar' ? shown.ar : shown.en}</p>
      </div>
      <div className="coach-avatar" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coach-avatar.jpg" alt="" width={88} height={88} />
      </div>
    </div>
  )
}
