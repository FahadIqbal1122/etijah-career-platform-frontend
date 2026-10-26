'use client'

// CountUp — counts a number up the first time it scrolls into view. Takes the copy as written ("88,500+", "+15",
// "59 SAR") and keeps its prefix, suffix and thousands separators. Text without a plain number (and years such as
// 2010) is shown as is. The full value is rendered on the server and for reduced-motion users.

import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, duration = 1500 }: { value: string; duration?: number }) {
  const m = /^(\D*?)(\d[\d,]*)(.*)$/.exec(value)
  const digits = m ? m[2].replace(/,/g, '') : ''
  const target = m ? parseInt(digits, 10) : NaN
  const isYear = !!m && !m[2].includes(',') && digits.length === 4 && target >= 1900 && target <= 2100
  const animate = !!m && !isYear && Number.isFinite(target)

  const ref = useRef<HTMLSpanElement | null>(null)
  const [n, setN] = useState(target)

  useEffect(() => {
    const el = ref.current
    if (!el || !animate) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / duration)
        setN(Math.round(target * (1 - Math.pow(1 - k, 3)))) // ease-out
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      setN(0)
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [animate, target, duration])

  if (!animate || !m) return <>{value}</>
  const shown = m[2].includes(',') ? n.toLocaleString('en-US') : String(n)
  return <span ref={ref} className="tabular-nums" aria-label={value}>{m[1]}{shown}{m[3]}</span>
}
