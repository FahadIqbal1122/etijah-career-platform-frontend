'use client'

import { useEffect, useMemo, useState } from 'react'

function getTimeLeft(targetMs: number) {
  const diff = Math.max(0, targetMs - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff <= 0,
  }
}

export default function CountdownTimer({ target, labels }: {
  target: string
  labels: { days: string; hours: string; minutes: string; seconds: string; ended: string }
}) {
  const targetMs = useMemo(() => new Date(target).getTime(), [target])
  const [t, setT] = useState(() => getTimeLeft(targetMs))

  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(targetMs)), 1000)
    return () => clearInterval(id)
  }, [targetMs])

  if (t.done) {
    return <p className="text-sm font-semibold text-teal">{labels.ended}</p>
  }

  const units = [
    { v: t.days, l: labels.days },
    { v: t.hours, l: labels.hours },
    { v: t.minutes, l: labels.minutes },
    { v: t.seconds, l: labels.seconds },
  ]

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {units.map((u) => (
        <div key={u.l} className="flex flex-col items-center">
          <span className="font-mono font-extrabold text-2xl sm:text-3xl text-charcoal tabular-nums">
            {String(u.v).padStart(2, '0')}
          </span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-charcoal/55 mt-1">{u.l}</span>
        </div>
      ))}
    </div>
  )
}
