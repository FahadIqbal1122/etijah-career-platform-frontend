'use client'

import { Link } from '@/i18n/navigation'

// Shared "locked / upgrade to unlock" card — same visual language as the
// dashboard's pre-Phase-4 Job Matches preview (lock icon + tag + heading/body),
// reused for paywalled report sections and not-yet-built feature previews.
export function LockedSection({
  tag,
  title,
  body,
  ctaLabel,
  ctaHref,
  footer,
}: {
  tag: string
  title: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  footer?: string
}) {
  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-primary">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <span className="rp-pill rp-gray">{tag}</span>
      </div>
      <h3 className="text-lg font-extrabold text-charcoal">{title}</h3>
      <p className="rp-sub mt-1">{body}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="cta cta-teal inline-flex mt-4" style={{ padding: '10px 18px', fontSize: 14, borderRadius: 999 }}>
          {ctaLabel}
        </Link>
      )}
      {footer && <span className="inline-block mt-4 text-xs font-medium text-charcoal/70">{footer}</span>}
    </div>
  )
}
