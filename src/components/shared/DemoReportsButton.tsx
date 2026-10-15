'use client'

// Button that opens the sample-report chooser popup (DemoReportsModal).
// Self-contained so it can replace the old single-PDF <a> links anywhere.

import { useState, type ReactNode } from 'react'
import DemoReportsModal from '@/components/shared/DemoReportsModal'

export default function DemoReportsButton({ locale, source, className, children, track }: {
  locale: string
  source: string
  className?: string
  children: ReactNode
  track?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-track={track} className={className}>{children}</button>
      <DemoReportsModal open={open} onClose={() => setOpen(false)} locale={locale} source={source} />
    </>
  )
}
