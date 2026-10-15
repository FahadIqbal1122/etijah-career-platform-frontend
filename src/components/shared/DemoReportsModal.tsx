'use client'

// "View a sample report" popup: one sample per report scenario instead of a
// single PDF. Each card opens that scenario's PDF (page language) in a new tab.

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DEMO_REPORTS, demoReportHref } from '@/data/demoReports'

const COPY = {
  en: { title: 'Choose a sample report', body: 'Your report is tailored to where you are. Pick the one closest to you.', close: 'Close' },
  ar: { title: 'اختر نموذج تقرير', body: 'يُصمَّم تقريرك بحسب مرحلتك. اختر النموذج الأقرب إليك.', close: 'إغلاق' },
}

export default function DemoReportsModal({ open, onClose, locale, source }: {
  open: boolean
  onClose: () => void
  locale: string
  source: string
}) {
  const l = locale === 'ar' ? 'ar' : 'en'
  const t = COPY[l]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Portalled to <body> so no transformed ancestor can trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir={l === 'ar' ? 'rtl' : 'ltr'} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t.title}
        className="card w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-charcoal">{t.title}</h3>
            <p className="mt-1 text-sm text-charcoal/60">{t.body}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.close} className="text-charcoal/50 hover:text-charcoal text-xl leading-none">×</button>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {DEMO_REPORTS.map(r => (
            <li key={r.key}>
              <a href={demoReportHref(r.key, l)} target="_blank" rel="noopener noreferrer"
                data-track={`sample_report_${r.key}`} data-source={source}
                className="block h-full rounded-xl border border-[var(--line)] p-4 hover:border-primary hover:bg-primary/5 transition-colors">
                <span className="block text-sm font-bold text-charcoal">{r.title[l]} <span aria-hidden="true">↗</span></span>
                <span className="block mt-1 text-xs text-charcoal/60 leading-snug">{r.body[l]}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  )
}
