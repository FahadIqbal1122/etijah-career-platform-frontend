'use client'

// Opt-in "report a bug" flow for the assessment — a small trigger in the
// topbar opens this modal. Entirely separate from answers/scoring: posts to
// /api/bug-report, which is unauthenticated and rate-limited, same as the
// existing /api/feedback route.

import { useState } from 'react'

interface Bi { en: string; ar: string }

const copy = {
  trigger: { en: 'Report a bug', ar: 'الإبلاغ عن مشكلة' } as Bi,
  title: { en: 'Report a bug', ar: 'الإبلاغ عن مشكلة' } as Bi,
  subtitle: { en: "What went wrong? We'll take a look.", ar: 'ما الذي حدث؟ سنطّلع عليه فورًا.' } as Bi,
  placeholder: { en: 'Describe what happened…', ar: 'صف ما حدث…' } as Bi,
  emailLabel: { en: 'Email (optional, if you want a reply)', ar: 'البريد الإلكتروني (اختياري، إذا أردت ردًا)' } as Bi,
  cancel: { en: 'Cancel', ar: 'إلغاء' } as Bi,
  submit: { en: 'Send report', ar: 'إرسال' } as Bi,
  sending: { en: 'Sending…', ar: 'جارٍ الإرسال…' } as Bi,
  thanks: { en: "Thanks — we've got it.", ar: 'شكرًا — تم استلام البلاغ.' } as Bi,
  error: { en: 'Could not send, please try again.', ar: 'تعذّر الإرسال، حاول مرة أخرى.' } as Bi,
}

function t(bi: Bi, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? bi.ar : bi.en
}

interface Props {
  locale: 'en' | 'ar'
  page?: string
}

export default function BugReportModal({ locale, page }: Props) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  function close() {
    setOpen(false)
    setDescription('')
    setEmail('')
    setStatus('idle')
  }

  async function submit() {
    if (!description.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          email: email.trim() || undefined,
          locale,
          device_type: typeof window !== 'undefined' && window.innerWidth < 900 ? 'mobile' : 'desktop',
          page,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button type="button" className="assess-bugreport" onClick={() => setOpen(true)}>
        {t(copy.trigger, locale)}
      </button>
      {open && (
        <div className="bugreport-overlay" onClick={close}>
          <div className="bugreport-card" onClick={e => e.stopPropagation()} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {status === 'sent' ? (
              <>
                <h3>{t(copy.thanks, locale)}</h3>
                <div className="bugreport-actions">
                  <button type="button" className="bugreport-btn-primary" onClick={close}>OK</button>
                </div>
              </>
            ) : (
              <>
                <h3>{t(copy.title, locale)}</h3>
                <p className="bugreport-sub">{t(copy.subtitle, locale)}</p>
                <textarea
                  rows={4}
                  placeholder={t(copy.placeholder, locale)}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  autoFocus
                />
                <input
                  type="email"
                  placeholder={t(copy.emailLabel, locale)}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                {status === 'error' && (
                  <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{t(copy.error, locale)}</p>
                )}
                <div className="bugreport-actions">
                  <button type="button" className="bugreport-btn-secondary" onClick={close}>{t(copy.cancel, locale)}</button>
                  <button
                    type="button"
                    className="bugreport-btn-primary"
                    disabled={!description.trim() || status === 'sending'}
                    onClick={submit}
                  >
                    {status === 'sending' ? t(copy.sending, locale) : t(copy.submit, locale)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
