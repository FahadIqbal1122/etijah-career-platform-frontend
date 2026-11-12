'use client'

// The small form a parent fills in before going to payment: their email (the receipt and the child's link go there),
// the child's first name, and the terms. Opened from the pricing buttons on the parents page.
import { useState } from 'react'
import { buyForChild, previewParentDiscount, type DiscountPreview, type PlanCode } from '@/lib/api'
import { readCurrencyCookie } from '@/lib/pricing'

const T = {
  en: {
    head: 'Where should we send the link?', email: 'Your email', child: 'Your child’s first name (optional)',
    agree: 'I am the parent or guardian, and I agree to the', terms: 'Terms and Conditions', and: 'and the', privacy: 'Privacy Policy',
    note: 'We email you a link to give your child. When they finish, you get a private link to read the report.',
    go: 'Continue to payment', cancel: 'Cancel', fail: 'Could not start payment. Please try again.',
    code: 'Discount code (optional)', apply: 'Apply', remove: 'Remove', youPay: 'You pay',
    codeErrors: {
      discount_invalid: "This code isn't valid.", discount_expired: 'This code has expired.', discount_not_started: "This code isn't active yet.",
      discount_used_up: 'This code has reached its limit.', discount_already_used: "You've already used this code.",
      discount_wrong_plan: "This code doesn't apply to this plan.", discount_rate_limited: 'Too many attempts. Please try again later.',
      discount_unavailable: 'Codes are unavailable right now. Please try again.',
    } as Record<string, string>,
  },
  ar: {
    head: 'إلى أين نرسل الرابط؟', email: 'بريدك الإلكتروني', child: 'الاسم الأول لابنك أو ابنتك (اختياري)',
    agree: 'أنا ولي الأمر، وأوافق على', terms: 'الشروط والأحكام', and: 'و', privacy: 'سياسة الخصوصية',
    note: 'نرسل لك رابطاً تعطيه لابنك أو ابنتك. وعند انتهائه تصلك روابط خاصة لقراءة التقرير.',
    go: 'إتمام الدفع', cancel: 'إلغاء', fail: 'تعذّر بدء الدفع. حاول مرة أخرى.',
    code: 'كود الخصم (اختياري)', apply: 'تطبيق', remove: 'إزالة', youPay: 'المبلغ المستحق',
    codeErrors: {
      discount_invalid: 'هذا الكود غير صالح.', discount_expired: 'انتهت صلاحية هذا الكود.', discount_not_started: 'هذا الكود غير مفعّل بعد.',
      discount_used_up: 'تم استنفاد عدد مرات استخدام هذا الكود.', discount_already_used: 'لقد استخدمت هذا الكود من قبل.',
      discount_wrong_plan: 'هذا الكود لا ينطبق على هذه الباقة.', discount_rate_limited: 'محاولات كثيرة. حاول لاحقاً.',
      discount_unavailable: 'الأكواد غير متاحة حالياً. حاول مرة أخرى.',
    } as Record<string, string>,
  },
}

export default function ParentBuyForm({ plan, lang, onClose }: { plan: PlanCode; lang: 'en' | 'ar'; onClose: () => void }) {
  const t = T[lang]
  const [email, setEmail] = useState('')
  const [child, setChild] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Discount code: checked against the server when "Apply" is pressed, and sent again with the purchase (the server re-checks it).
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; preview: DiscountPreview } | null>(null)
  const [codeError, setCodeError] = useState('')
  const [checking, setChecking] = useState(false)
  const currency = readCurrencyCookie() ?? 'SAR'

  async function applyCode() {
    const c = code.trim().toUpperCase()
    if (!c || checking) return
    setChecking(true); setCodeError('')
    try {
      setApplied({ code: c, preview: await previewParentDiscount(plan, c, currency) })
    } catch (e) {
      setApplied(null)
      setCodeError(t.codeErrors[e instanceof Error ? e.message : ''] ?? t.codeErrors.discount_invalid)
    } finally { setChecking(false) }
  }
  const money = (n: number, cur: string) => `${n.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 })} ${cur}`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !agreed) return
    setBusy(true); setError('')
    try {
      const { checkout_url } = await buyForChild({
        parent_email: email.trim(), child_first_name: child.trim() || undefined, plan_code: plan,
        locale: lang, currency, consent: true, discount_code: applied?.code,
      })
      window.location.href = checkout_url
    } catch (e) {
      setBusy(false)
      const msg = e instanceof Error ? e.message : ''
      if (msg.startsWith('discount_')) { setApplied(null); setCodeError(t.codeErrors[msg] ?? t.codeErrors.discount_invalid) } else setError(t.fail)
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
        <div>
          <label className="block text-sm font-medium text-charcoal/70 mb-1">{t.code}</label>
          <div className="flex gap-2">
            <input
              className={input} value={applied ? applied.code : code} dir="ltr" maxLength={40} autoCapitalize="characters" autoComplete="off" disabled={!!applied}
              onChange={e => { setCode(e.target.value); setCodeError('') }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void applyCode() } }}
            />
            {applied
              ? <button type="button" onClick={() => { setApplied(null); setCode('') }} className="px-4 rounded-xl border border-[var(--line-strong)] text-sm whitespace-nowrap">{t.remove}</button>
              : <button type="button" onClick={applyCode} disabled={checking || !code.trim()} className="px-4 rounded-xl border border-[var(--line-strong)] text-sm font-semibold disabled:opacity-40 whitespace-nowrap">{checking ? '…' : t.apply}</button>}
          </div>
          {codeError && <p className="mt-1.5 text-sm text-red-600">{codeError}</p>}
          {applied && (
            <p className="mt-1.5 text-sm text-charcoal/80" dir="ltr" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
              <span className="line-through text-charcoal/50">{money(applied.preview.original, applied.preview.currency)}</span>{' '}
              <span className="font-bold text-primary">{t.youPay}: {money(applied.preview.final, applied.preview.currency)}</span>
            </p>
          )}
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
