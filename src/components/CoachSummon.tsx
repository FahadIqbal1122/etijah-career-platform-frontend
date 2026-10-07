'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

// A small tab on the side edge of the screen that brings Sarah back after someone pressed her cross. It sits
// halfway down the side, not in a bottom corner (a round button down there reads as customer service), slides
// out a little on hover or focus, and can be dragged up or down along its edge (the height is remembered).
const KEY = 'sarahTabY'
const TOP_MIN = 110
const clampTop = (y: number) => Math.min(Math.max(y, TOP_MIN), window.innerHeight - 90)

export default function CoachSummon({ locale, onShow }: { locale: 'en' | 'ar'; onShow: () => void }) {
  const inBrowser = useSyncExternalStore(() => () => {}, () => true, () => false)
  const [top, setTop] = useState<number | null>(() => {
    try { const v = Number(window.localStorage.getItem(KEY)); return v > 0 ? v : null } catch { return null }
  })
  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  if (!inBrowser) return null
  const label = locale === 'ar' ? 'أرجع سارة' : 'Bring Sarah back'
  const shownTop = clampTop(top ?? window.innerHeight * 0.46)

  return createPortal(
    <button
      type="button" className="coach-summon" dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={label} title={label}
      style={{ top: shownTop }}
      onClick={() => { if (!justDragged.current) onShow() }}
      onDragStart={e => e.preventDefault()}
      onPointerDown={e => {
        if (e.button > 0) return
        drag.current = { startY: e.clientY, startTop: shownTop, moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={e => {
        const d = drag.current
        if (!d) return
        if (!d.moved && Math.abs(e.clientY - d.startY) < 6) return
        d.moved = true
        setTop(clampTop(d.startTop + e.clientY - d.startY))
      }}
      onPointerUp={() => {
        const d = drag.current
        drag.current = null
        if (!d?.moved) return
        justDragged.current = true
        setTimeout(() => { justDragged.current = false }, 0)
        try { window.localStorage.setItem(KEY, String(Math.round(top ?? shownTop))) } catch {}
      }}
      onPointerCancel={() => { drag.current = null }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/coach-avatar.jpg" alt="" width={32} height={32} draggable={false} />
      <span>{locale === 'ar' ? 'سارة' : 'Sarah'}</span>
    </button>,
    document.body,
  )
}
