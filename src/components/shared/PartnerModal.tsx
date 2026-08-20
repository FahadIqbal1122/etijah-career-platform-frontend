'use client'

// Simple "Partner with us" popup form for institutions — used by the FOR
// INSTITUTIONS band on both Landing.tsx and Waitlist.tsx. Posts to
// /api/partners → backend /partners → `partner_inquiries` table.

import { useState } from 'react'

type FormState = 'idle' | 'submitting' | 'done' | 'error'

const COPY = {
  en: {
    title: 'Partner with us',
    body: "Tell us a bit about your institution and we'll get back to you.",
    companyName: 'Institution / company name',
    contactName: 'Your name',
    email: 'Work email',
    phone: 'Phone (optional)',
    message: 'What are you looking for? (optional)',
    submit: 'Send',
    submitting: 'Sending…',
    done: "Thanks — we'll be in touch soon.",
    error: 'Something went wrong. Please try again.',
    close: 'Close',
    required: 'Please fill in the required fields.',
  },
  ar: {
    title: 'كن شريكًا معنا',
    body: 'أخبرنا قليلاً عن مؤسستك وسنتواصل معك.',
    companyName: 'اسم المؤسسة / الشركة',
    contactName: 'اسمك',
    email: 'البريد الإلكتروني للعمل',
    phone: 'الهاتف (اختياري)',
    message: 'ما الذي تبحث عنه؟ (اختياري)',
    submit: 'إرسال',
    submitting: 'جارٍ الإرسال…',
    done: 'شكرًا — سنتواصل معك قريبًا.',
    error: 'حدث خطأ ما. حاول مرة أخرى.',
    close: 'إغلاق',
    required: 'يرجى تعبئة الحقول المطلوبة.',
  },
}

export default function PartnerModal({ open, onClose, locale, source }: {
  open: boolean
  onClose: () => void
  locale: string
  source: string
}) {
  const t = (locale === 'ar' ? COPY.ar : COPY.en)
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  if (!open) return null

  const errCls = (key: string) => (errors[key] ? ' !border-red-500' : '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const nextErrors = {
      companyName: !companyName.trim(),
      contactName: !contactName.trim(),
      email: !emailValid,
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      setState('error')
      return
    }
    setState('submitting')
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          message: message.trim() || null,
          locale,
          source,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setState('done')
    } catch {
      setState('error')
    }
  }

  function handleClose() {
    onClose()
    // reset after the close animation would be (there isn't one — just clear on next open cycle)
    setState('idle')
    setErrors({})
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir={dir} onClick={handleClose}>
      <div className="card w-full max-w-md p-8" onClick={(e) => e.stopPropagation()}>
        {state === 'done' ? (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-extrabold text-charcoal">{t.title}</h3>
            <p className="text-sm text-charcoal/70">{t.done}</p>
            <button className="cta cta-outline w-full justify-center" onClick={handleClose}>{t.close}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-charcoal">{t.title}</h3>
              <p className="mt-1 text-sm text-charcoal/60">{t.body}</p>
            </div>

            <input
              className={`w-full text-sm rounded-full py-3.5 px-5 border bg-white text-charcoal border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-teal/20${errCls('companyName')}`}
              placeholder={t.companyName}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <input
              className={`w-full text-sm rounded-full py-3.5 px-5 border bg-white text-charcoal border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-teal/20${errCls('contactName')}`}
              placeholder={t.contactName}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <input
              type="email"
              className={`w-full text-sm rounded-full py-3.5 px-5 border bg-white text-charcoal border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-teal/20${errCls('email')}`}
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full text-sm rounded-full py-3.5 px-5 border bg-white text-charcoal border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-teal/20"
              placeholder={t.phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <textarea
              className="w-full text-sm rounded-2xl py-3.5 px-5 border bg-white text-charcoal border-[var(--line-strong)] focus:outline-none focus:ring-2 focus:ring-teal/20 resize-none"
              placeholder={t.message}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {state === 'error' && (
              <p className="text-sm text-red-600">{t.required}</p>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button type="submit" className="cta w-full justify-center" disabled={state === 'submitting'}>
                {state === 'submitting' ? t.submitting : t.submit}
              </button>
              <button type="button" className="w-full py-3 rounded-2xl border border-[var(--line-strong)] text-charcoal/70 font-medium hover:bg-lightblue transition-colors" onClick={handleClose}>
                {t.close}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
