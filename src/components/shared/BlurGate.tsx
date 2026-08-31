'use client'

import { Link } from '@/i18n/navigation'
import type { ReactNode } from 'react'

// Renders `children` blurred and non-interactive with a centered "sign up to
// unlock" card floating on top. Used to tease report content (real data, or a
// generic placeholder when the backend already omits real data for free tier)
// to anonymous visitors so they create an account instead of the section just
// vanishing behind a plain upgrade card.
export function BlurGate({
  children,
  title,
  body,
  ctaLabel = 'Create free account',
  ctaHref = '/signup',
}: {
  children: ReactNode
  title: string
  body: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm opacity-70">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="card p-6 max-w-sm text-center shadow-lg">
          <div className="flex justify-center mb-2">
            <span className="text-primary">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
          </div>
          <h3 className="text-base font-extrabold text-charcoal">{title}</h3>
          <p className="text-sm text-charcoal/60 mt-1">{body}</p>
          <Link href={ctaHref} className="cta inline-flex mt-4" style={{ padding: '9px 18px', fontSize: 13, borderRadius: 999 }}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
