'use client'

import { use, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { getGift, type GiftInfo } from '@/lib/api'

export const GIFT_KEY = 'etijahi:gift'

const T = {
  en: {
    head: (n: string | null) => `${n ? n + ', your' : 'Your'} parent has paid for your full career report`,
    body: 'Take the assessment first (about 15 minutes). When you finish, your full report unlocks on your own account. Your parent can then read it through a private link.',
    cta: 'Start the assessment', wait: 'Your parent’s payment is still being confirmed. Try again in a minute.',
    used: 'This link has already been used.', expired: 'This link has expired. Ask your parent for a new one.', invalid: 'This link is not valid.',
  },
  ar: {
    head: (n: string | null) => `${n ? n + '، ' : ''}والدك دفع لك تقرير المسار المهني الكامل`,
    body: 'ابدأ التقييم أولاً (نحو ١٥ دقيقة). عند الانتهاء يُفتح تقريرك الكامل في حسابك، ويستطيع والدك قراءته عبر رابط خاص.',
    cta: 'ابدأ التقييم', wait: 'ما زلنا نؤكد دفع والدك. حاول بعد دقيقة.',
    used: 'هذا الرابط استُخدم من قبل.', expired: 'انتهت صلاحية هذا الرابط. اطلب رابطاً جديداً من والدك.', invalid: 'هذا الرابط غير صالح.',
  },
}

export default function StartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const locale = useLocale()
  const t = T[locale === 'ar' ? 'ar' : 'en']
  const [info, setInfo] = useState<GiftInfo | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    getGift(token).then(i => {
      setInfo(i)
      if (i.status === 'paid') { try { window.localStorage.setItem(GIFT_KEY, token) } catch { /* the child can reopen the link */ } }
    }).catch((e: unknown) => setErr(e instanceof Error && e.message === 'link_expired' ? 'expired' : 'invalid'))
  }, [token])

  let body: React.ReactNode = <p className="text-center text-charcoal/50">…</p>
  if (err) body = <p className="text-center text-charcoal">{err === 'expired' ? t.expired : t.invalid}</p>
  else if (info?.status === 'redeemed') body = <p className="text-center text-charcoal">{t.used}</p>
  else if (info?.status === 'pending') body = <p className="text-center text-charcoal">{t.wait}</p>
  else if (info) body = (
    <>
      <h1 className="text-lg font-extrabold text-charcoal">{t.head(info.child_first_name)}</h1>
      <p className="mt-3 text-sm text-charcoal/70 leading-relaxed">{t.body}</p>
      <Link href="/assessment" className="mt-5 block w-full text-center px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold">{t.cta}</Link>
    </>
  )
  return (
    <div className="min-h-screen brand-surface flex items-center justify-center px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="card p-8 w-full max-w-md">{body}</div>
    </div>
  )
}
