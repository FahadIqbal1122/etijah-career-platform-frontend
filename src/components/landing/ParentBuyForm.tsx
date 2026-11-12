'use client'

// The small form a parent fills in before going to payment: their email (the receipt and the child's link go there),
// the child's first name, and the terms. Opened from the pricing buttons on the parents page.
import { useState } from 'react'
import { buyForChild, type PlanCode } from '@/lib/api'
import { readCurrencyCookie } from '@/lib/pricing'

const T = {
  en: {
    head: 'Where should we send the link?', email: 'Your email', child: 'Your child’s first name (optional)',
    agree: 'I am the parent or guardian, and I agree to the', terms: 'Terms and Conditions', and: 'and the', privacy: 'Privacy Policy',
    note: 'We email you a link to give your child. When they finish, you get a private link to read the report.',
    go: 'Continue to payment', cancel: 'Cancel', fail: 'Could not start payment. Please try again.',
  },
  ar: {
    head: 'إلى أين نرسل الرابط؟', email: 'بريدك الإلكتروني', child: 'الاسم الأول لابنك أو ابنتك (اختياري)',
    agree: 'أنا ولي الأمر، وأوافق على', terms: 'الشروط والأحكام', and: 'و', privacy: 'سياسة الخصوصية',
    note: 'نرسل لك رابطاً تعطيه لابنك أو ابنتك. وعند انتهائه تصلك روابط خاصة لقراءة التقرير.',
    go: 'إتمام الدفع', cancel: 'إلغاء', fail: 'تعذّر بدء الدفع. حاول مرة أخرى.',
  },
}

export default function ParentBuyForm({ plan, lang, onClose }: { plan: PlanCode; lang: 'en' | 'ar'; onClose: () => void }) {
  const t = T[lang]
  const [email, setEmail] = useState('')
  const [child, setChild] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !agreed) return
    setBusy(true); setError('')
    try {
      const { checkout_url } = await buyForChild({
        parent_email: email.trim(), child_first_name: child.trim() || undefined, plan_code: plan,
        locale: lang, currency: readCurrencyCookie() ?? 'SAR', consent: true,
      })
      window.location.href = checkout_url
    } catch {
      setBusy(false); setError(t.fail)
    }
  }
  const input = 'w-full min-w-0 rounded-xl border border-[var(--line-strong)] px-3 py-3 text-base text-charcoal bg-white'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'} role="dialog" aria-modal="true">
      <form onSubmit={submit} className="card p-6 w-full max-w-md space-y-4 bg-white">
        <h2 className="text-lg font-extrabold text-charcoal">{t.head}</h2>
        <p className="text-sm text-charcoal/70">{t.note}</p>
        <div>
          <label className="block text-sm font-medium text-charcoal/70 mb-1">{t.email}</label>
          <input type="email" required className={input} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal/70 mb-1">{t.child}</label>
          <input className={input} value={child} onChange={e => setChild(e.target.value)} maxLength={60} />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 shrink-0" />
          <span className="text-sm text-charcoal/80 leading-relaxed">
            {t.agree}{' '}
            <a href="https://shop.etijahcoaching.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t.terms}</a>
            {' '}{t.and}{' '}
            <a href="https://shop.etijahcoaching.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t.privacy}</a>.
          </span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-3 rounded-xl border border-[var(--line-strong)] text-sm">{t.cancel}</button>
          <button type="submit" disabled={busy || !agreed || !email.trim()} className="flex-1 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40">{busy ? '…' : t.go}</button>
        </div>
      </form>
    </div>
  )
}
