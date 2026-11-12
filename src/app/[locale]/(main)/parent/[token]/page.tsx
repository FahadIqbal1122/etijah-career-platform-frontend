'use client'

import { use, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { getParentStatus, type ParentStatus } from '@/lib/api'
import { trackOnce } from '@/lib/analytics'
import { getAttribution } from '@/lib/attribution'

const T = {
  en: {
    pending: 'We are confirming your payment. This page updates by itself, refresh in a minute.',
    paid: (n: string | null) => `Payment received. Send ${n || 'your child'} this link so they can start:`,
    copy: 'Copy link', copied: 'Copied',
    paidNote: 'When they finish the assessment, the full report unlocks and you can read it here.',
    done: (n: string | null) => `${n || 'Your child'} finished the assessment. The full report is ready.`, read: 'Read the report',
    invalid: 'This page is not valid.',
  },
  ar: {
    pending: 'نؤكد دفعك الآن. تتحدّث هذه الصفحة تلقائياً، حدّثها بعد دقيقة.',
    paid: (n: string | null) => `وصلنا الدفع. أرسل هذا الرابط إلى ${n || 'ابنك أو ابنتك'} ليبدأ:`,
    copy: 'نسخ الرابط', copied: 'تم النسخ',
    paidNote: 'عند انتهائه من التقييم يُفتح التقرير الكامل وتستطيع قراءته هنا.',
    done: (n: string | null) => `${n || 'ابنك أو ابنتك'} أنهى التقييم والتقرير الكامل جاهز.`, read: 'اقرأ التقرير',
    invalid: 'هذه الصفحة غير صالحة.',
  },
}

export default function ParentStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const locale = useLocale()
  const t = T[locale === 'ar' ? 'ar' : 'en']
  const [s, setS] = useState<ParentStatus | null>(null)
  const [bad, setBad] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    let finished = false
    const load = () => getParentStatus(token).then(r => {
      if (!alive) return
      setS(r)
      finished = r.status === 'redeemed'
      // The same `report_purchase` event (and once-per-order key) the dashboard and the pay gate use, tagged as a parent purchase.
      if (r.status !== 'pending' && r.order_ref) {
        const att = getAttribution() ?? {}
        let variant: number | undefined
        try { const v = window.localStorage.getItem('parents:cta'); variant = v === null ? undefined : Number(v) + 1 } catch { /* none */ }
        trackOnce(`purchase:${r.order_ref}`, 'report_purchase', {
          value: r.amount, currency: r.currency, transaction_id: r.order_ref, event_id: r.order_ref, buyer: 'parent', cta_variant: variant,
          utm_source: att.utm_source, utm_medium: att.utm_medium, utm_campaign: att.utm_campaign, utm_term: att.utm_term, gclid: att.gclid,
        }, 'local')
      }
    }).catch(() => { if (alive) setBad(true) })
    load()
    const id = window.setInterval(() => { if (!finished) load() }, 15000)
    return () => { alive = false; window.clearInterval(id) }
  }, [token])

  let body: React.ReactNode = <p className="text-center text-charcoal/50">…</p>
  if (bad) body = <p className="text-center text-charcoal">{t.invalid}</p>
  else if (s?.status === 'pending') body = <p className="text-charcoal">{t.pending}</p>
  else if (s?.status === 'paid') body = (
    <>
      <p className="text-charcoal font-semibold">{t.paid(s.child_first_name)}</p>
      <p className="mt-3 break-all rounded-xl bg-white/70 border border-[var(--line-strong)] p-3 text-sm" dir="ltr">{s.gift_url}</p>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(s.gift_url ?? '').then(() => setCopied(true)).catch(() => {}) }}
        className="mt-3 w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">{copied ? t.copied : t.copy}</button>
      <p className="mt-4 text-sm text-charcoal/70">{t.paidNote}</p>
    </>
  )
  else if (s?.status === 'redeemed') body = (
    <>
      <p className="text-charcoal font-semibold">{t.done(s.child_first_name)}</p>
      {s.report_url && <a href={s.report_url} className="mt-4 block text-center px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold">{t.read}</a>}
    </>
  )
  return (
    <div className="min-h-screen brand-surface flex items-center justify-center px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="card p-8 w-full max-w-md">{body}</div>
    </div>
  )
}
