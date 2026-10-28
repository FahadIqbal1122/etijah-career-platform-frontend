'use client'

import { use, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { getParentLink, payParentLink, type ParentLinkInfo } from '@/lib/api'

type State = 'loading' | 'ok' | 'link_used' | 'link_expired' | 'link_invalid'

const T = {
  en: {
    head: (n: string, plan: string) => `${n || 'Your child'} asked you to unlock their ${plan} report`,
    agree: 'I am the parent or guardian, and I have read and agree to the', terms: 'Terms and Conditions', and: 'and the', privacy: 'Privacy Policy',
    tax: 'The price includes tax.', cont: 'Continue to payment',
    used: 'Payment received. Thank you! The report is being unlocked on their account.',
    expired: 'This link has expired. Please ask for a new one.', invalid: 'This link is not valid. Please ask for a new one.',
    fail: 'Could not start payment',
  },
  ar: {
    head: (n: string, plan: string) => `${n || 'ابنك/ابنتك'} يطلب منك فتح تقرير ${plan}`,
    agree: 'أنا ولي الأمر، وقد قرأت وأوافق على', terms: 'الشروط والأحكام', and: 'و', privacy: 'سياسة الخصوصية',
    tax: 'السعر شامل الضريبة.', cont: 'المتابعة إلى الدفع',
    used: 'تم استلام الدفع. شكراً لك! يتم الآن فتح التقرير على حسابه.',
    expired: 'انتهت صلاحية هذا الرابط. يرجى طلب رابط جديد.', invalid: 'هذا الرابط غير صالح. يرجى طلب رابط جديد.',
    fail: 'تعذّر بدء الدفع',
  },
}

export default function PayForPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const locale = useLocale()
  const t = T[locale === 'ar' ? 'ar' : 'en']
  const [info, setInfo] = useState<ParentLinkInfo | null>(null)
  const [state, setState] = useState<State>('loading')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getParentLink(token)
      .then(i => { setInfo(i); setState('ok') })
      .catch((e: unknown) => {
        const m = e instanceof Error ? e.message : ''
        setState(m === 'link_used' || m === 'link_expired' ? m : 'link_invalid')
      })
  }, [token])

  async function pay() {
    setBusy(true); setError('')
    try {
      const { checkout_url } = await payParentLink(token)
      window.location.href = checkout_url
    } catch (e: unknown) {
      setBusy(false)
      setError(e instanceof Error && e.message ? e.message : t.fail)
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen brand-surface flex items-center justify-center px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="card p-8 w-full max-w-md">{children}</div>
    </div>
  )

  if (state === 'loading') return shell(<p className="text-center text-charcoal/50">…</p>)
  if (state === 'link_used') return shell(<p className="text-center text-charcoal">{t.used}</p>)
  if (state === 'link_expired') return shell(<p className="text-center text-charcoal">{t.expired}</p>)
  if (state !== 'ok' || !info) return shell(<p className="text-center text-charcoal">{t.invalid}</p>)

  return shell(
    <>
      <h1 className="text-lg font-extrabold text-charcoal">{t.head(info.child_first_name, info.plan_name)}</h1>
      <p className="mt-3 text-3xl font-extrabold text-charcoal" dir="ltr">{info.amount} {info.currency}</p>
      <p className="text-sm text-charcoal/60 mt-1">{t.tax}</p>
      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 shrink-0" />
        <span className="text-sm text-charcoal/80 leading-relaxed">
          {t.agree}{' '}
          <a href="https://shop.etijahcoaching.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t.terms}</a>
          {' '}{t.and}{' '}
          <a href="https://shop.etijahcoaching.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t.privacy}</a>.
        </span>
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <button onClick={pay} disabled={!agreed || busy}
        className="mt-5 w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-40">{busy ? '…' : t.cont}</button>
    </>
  )
}
