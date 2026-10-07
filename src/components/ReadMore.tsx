'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

// Short takeaway with the full explanation behind a "Read more" toggle. Shows no toggle when there is nothing more.
export default function ReadMore({ short, full, className = '' }: { short?: string; full?: string; className?: string }) {
  const t = useTranslations('results.profileDetails')
  const [open, setOpen] = useState(false)
  const norm = (s?: string) => (s || '').replace(/[….\s]+$/g, '').trim()
  const more = !!full && norm(full) !== norm(short) && full!.length > (short || '').length + 8
  const text = open && more ? full : short
  return (
    <span className={className}>
      {text}
      {more && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="ms-1.5 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
          {open ? t('readLess') : t('readMore')}
        </button>
      )}
    </span>
  )
}
